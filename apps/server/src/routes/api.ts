import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z, type ZodType } from 'zod';
import {
  newGameInputSchema,
  playerEditInputSchema,
} from '@football-life/shared';
import {
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_RETIREMENT_CONFIG,
  DEFAULT_WELLBEING_CONFIG,
  EVENT_DEFINITIONS,
  INJURY_TYPES,
} from '@football-life/game-data';
import { PrismaEditorRepository } from '../repositories/prisma-editor-repository';
import { PrismaEventRepository } from '../repositories/prisma-event-repository';
import { PrismaProgressionRepository } from '../repositories/prisma-progression-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { createNewGame } from '../application/create-new-game';
import { listSaves, loadGame } from '../application/load-game';
import { advanceWeeks } from '../application/advance-week';
import { editPlayer, loadEditablePlayer } from '../application/edit-player';
import {
  generateWeeklyEvent,
  resolvePendingEvent,
} from '../application/events';

const injuryTypeKeys = INJURY_TYPES.map((type) => type.key);

const advanceWeekSchema = z.object({
  weeks: z.number().int().min(1).max(52).optional(),
  intensity: z.enum(['REST', 'LIGHT', 'NORMAL', 'INTENSE']).optional(),
  focus: z
    .enum(['TECHNICAL', 'PHYSICAL', 'MENTAL', 'HIDDEN'])
    .nullable()
    .optional(),
});

const chooseSchema = z.object({ choiceKey: z.string().min(1) });

function parseBody<T>(
  schema: ZodType<T>,
  data: unknown,
  reply: FastifyReply,
): T | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    reply
      .code(400)
      .send({ error: 'ValidationError', issues: result.error.issues });
    return undefined;
  }
  return result.data;
}

export function registerApiRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
): void {
  const saveRepo = new PrismaSaveGameRepository(prisma);
  const progressionRepo = new PrismaProgressionRepository(prisma);
  const eventRepo = new PrismaEventRepository(prisma);
  const editorRepo = new PrismaEditorRepository(prisma);
  const eventDeps = { repository: eventRepo, definitions: EVENT_DEFINITIONS };

  app.post('/api/saves', async (request, reply) => {
    const input = parseBody(newGameInputSchema, request.body, reply);
    if (!input) return reply;
    const game = await createNewGame({ repository: saveRepo }, input);
    return reply.code(201).send(game);
  });

  app.get('/api/saves', async () => {
    return listSaves(saveRepo);
  });

  app.get('/api/saves/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(game);
  });

  app.get('/api/saves/:id/dashboard', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    const pendingEvents = await eventRepo.listPendingEvents(id);
    return reply.send({ save: game.save, player: game.player, pendingEvents });
  });

  app.post('/api/saves/:id/advance-week', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(advanceWeekSchema, request.body ?? {}, reply);
    if (!body) return reply;

    const report = await advanceWeeks(
      {
        repository: progressionRepo,
        config: DEFAULT_PROGRESSION_CONFIG,
        wellbeingConfig: DEFAULT_WELLBEING_CONFIG,
        retirementConfig: DEFAULT_RETIREMENT_CONFIG,
        injuryTypeKeys,
      },
      { saveGameId: id, ...body },
    );
    if (!report) return reply.code(404).send({ error: 'NotFound' });

    const event = await generateWeeklyEvent(eventDeps, { saveGameId: id });
    return reply.send({ report, event });
  });

  app.get('/api/saves/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(await eventRepo.listPendingEvents(id));
  });

  app.post('/api/saves/:id/events/:eventId/choose', async (request, reply) => {
    const { id, eventId } = request.params as { id: string; eventId: string };
    const body = parseBody(chooseSchema, request.body, reply);
    if (!body) return reply;
    const result = await resolvePendingEvent(eventDeps, {
      saveGameId: id,
      gameEventId: eventId,
      choiceKey: body.choiceKey,
    });
    if (!result) return reply.code(409).send({ error: 'EventNotResolvable' });
    return reply.send(result);
  });

  app.get('/api/saves/:id/editable-player', async (request, reply) => {
    const { id } = request.params as { id: string };
    const editable = await loadEditablePlayer({ repository: editorRepo }, id);
    if (!editable) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(editable);
  });

  app.patch('/api/saves/:id/player', async (request, reply) => {
    const { id } = request.params as { id: string };
    const edits = parseBody(playerEditInputSchema, request.body, reply);
    if (!edits) return reply;
    const updated = await editPlayer(
      { repository: editorRepo },
      {
        saveGameId: id,
        edits,
      },
    );
    if (!updated) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(updated);
  });

  app.get('/api/saves/:id/career-summary', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send({
      name: game.save.name,
      isCompleted: game.save.isCompleted,
      player: game.player,
    });
  });
}
