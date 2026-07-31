import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z, type ZodType } from 'zod';
import {
  AGENT_REQUEST_TYPES,
  newGameInputSchema,
  playerEditInputSchema,
  type WorldGenerationConfig,
} from '@football-life/shared';
import {
  COUNTRIES,
  DEFAULT_CAREER_CONFIG,
  DEFAULT_MATCH_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_RETIREMENT_CONFIG,
  DEFAULT_WELLBEING_CONFIG,
  DEFAULT_WORLD_CONFIG,
  EVENT_DEFINITIONS,
  INJURY_TYPES,
  QUICK_STARTS,
  quickStartOf,
} from '@football-life/game-data';
import { pickAutoSignClub } from '../application/quick-start';
import {
  clubEditSchema,
  competitionEditSchema,
  editClub,
  editCompetition,
  getEditableWorld,
} from '../application/world-editor';
import { PrismaWorldEditorRepository } from '../repositories/prisma-world-editor-repository';
import { PrismaSeasonSummaryRepository } from '../repositories/prisma-season-summary-repository';
import { PrismaLoanRepository } from '../repositories/prisma-loan-repository';
import { PrismaLeagueContextRepository } from '../repositories/prisma-league-context-repository';
import { decideLoan } from '../application/loans';
import { runWeeklyCycle } from '../application/weekly-cycle';
import { simulateToSeasonEnd } from '../application/simulate-to-season-end';
import { PrismaEditorRepository } from '../repositories/prisma-editor-repository';
import { PrismaFinanceRepository } from '../repositories/prisma-finance-repository';
import { PrismaEventRepository } from '../repositories/prisma-event-repository';
import { PrismaProgressionRepository } from '../repositories/prisma-progression-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaCareerRepository } from '../repositories/prisma-career-repository';
import { PrismaShopRepository } from '../repositories/prisma-shop-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaCupRepository } from '../repositories/prisma-cup-repository';
import { PrismaContinentalRepository } from '../repositories/prisma-continental-repository';
import { PrismaNationalTeamRepository } from '../repositories/prisma-national-team-repository';
import { PrismaAwardsRepository } from '../repositories/prisma-awards-repository';
import { PrismaCareerTimelineRepository } from '../repositories/prisma-career-timeline-repository';
import { PrismaStandingsRepository } from '../repositories/prisma-standings-repository';
import { PrismaSeasonRolloverRepository } from '../repositories/prisma-season-rollover-repository';
import { PrismaNpcAgingRepository } from '../repositories/prisma-npc-aging-repository';
import { PrismaCompetitionCalendarRepository } from '../repositories/prisma-competition-calendar-repository';
import { PrismaMatchdayRepository } from '../repositories/prisma-matchday-repository';
import { PrismaManagerStatusRepository } from '../repositories/prisma-manager-status-repository';
import { PrismaNextFixtureRepository } from '../repositories/prisma-next-fixture-repository';
import { PrismaTransferMarketRepository } from '../repositories/prisma-transfer-market-repository';
import { PrismaNewsRepository } from '../repositories/prisma-news-repository';
import { PrismaSeasonReviewRepository } from '../repositories/prisma-season-review-repository';
import { PrismaCareerStatsRepository } from '../repositories/prisma-career-stats-repository';
import { PrismaScoutingRepository } from '../repositories/prisma-scouting-repository';
import { PrismaTacticsRepository } from '../repositories/prisma-tactics-repository';
import { PrismaCalendarRepository } from '../repositories/prisma-calendar-repository';
import { PrismaYouthIntakeRepository } from '../repositories/prisma-youth-intake-repository';
import { createNewGame } from '../application/create-new-game';
import { listSaves, loadGame, removeSave } from '../application/load-game';
import { generateAndPersistWorld } from '../application/generate-world';
import { editPlayer, loadEditablePlayer } from '../application/edit-player';
import { getBalance, grantFunds } from '../application/finance';
import {
  listClubs,
  listProtagonistOffers,
  respondToOffer,
  signWithClub,
} from '../application/career';
import { buyItem, listShopItems } from '../application/shop';
import {
  chooseAgent,
  listAgents,
  negotiateWage,
  requestFromAgent,
  type AgentActionResult,
} from '../application/agent';
import { chooseLifestyle, listLifestyles } from '../application/lifestyle';
import { listCups, listHonours, simulateNationalCup } from '../application/cup';
import {
  getContinental,
  simulateContinental,
} from '../application/continental';
import {
  getNationalTeamTournament,
  simulateNationalTeamTournament,
} from '../application/national-team';
import { assignSeasonAwards } from '../application/awards';
import { buildCareerTimeline } from '../application/career-timeline';
import { getStandings } from '../application/standings';
import { getManagerStatus } from '../application/manager-status';
import { getNextFixture, saveMatchPlan } from '../application/match-plan';
import {
  answerPostMatch,
  getPendingPostMatch,
} from '../application/post-match';
import { getCareerLegacy, getSeasonStats } from '../application/career-legacy';
import { getScoutWatchers } from '../application/scouting';
import { getLeagueSpotlight } from '../application/league-context';
import { getTactics, setInstructions } from '../application/tactics';
import { getCalendarMonth } from '../application/calendar';
import { decideNationalCallup } from '../application/national-callup';
import { decideNaturalization } from '../application/naturalization';
import {
  getClubPresentation,
  markPresentationSeen,
} from '../application/club-presentation';
import {
  getAwardCeremony,
  markCeremonySeen,
} from '../application/award-ceremony';
import { PrismaNaturalizationRepository } from '../repositories/prisma-naturalization-repository';
import { getNews, markNewsRead, recordNews } from '../application/news';
import { getInterviewSession, submitInterview } from '../application/interview';
import { PrismaInterviewRepository } from '../repositories/prisma-interview-repository';
import { resolvePendingEvent } from '../application/events';
import { chooseInjuryTreatment } from '../application/injury-treatment';

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

const injuryTreatmentSchema = z.object({
  choice: z.enum(['REST', 'RUSH']),
});

const loanDecisionSchema = z.object({
  accept: z.boolean(),
  clubId: z.string().min(1).optional(),
});

const instructionsSchema = z.object({
  style: z.enum(['SHOOT', 'BALANCED', 'CREATE']),
  temperament: z.enum(['AGGRESSIVE', 'COMPOSED', 'DISCIPLINED']),
});

const matchPlanSchema = z.object({
  approach: z.enum(['DEFENSIVE', 'BALANCED', 'ATTACKING']),
  choices: z.record(z.string(), z.string()).default({}),
});

const postMatchSchema = z.object({ answerKey: z.string().min(1) });
const callupSchema = z.object({ accept: z.boolean() });

const signSchema = z.object({ clubId: z.string().min(1) });

const ceremonySeenSchema = z.object({ honourId: z.string().min(1) });
const respondOfferSchema = z.object({ accept: z.boolean() });

const buySchema = z.object({ itemKey: z.string().min(1) });

const chooseAgentSchema = z.object({ agentKey: z.string().min(1) });
const agentRequestSchema = z.object({ type: z.enum(AGENT_REQUEST_TYPES) });
const lifestyleSchema = z.object({ lifestyle: z.string().min(1) });
const avatarSchema = z.object({
  dataUrl: z
    .union([z.string().startsWith('data:image/').max(900_000), z.null()])
    .optional(),
});
const interviewSchema = z.object({
  answers: z
    .array(
      z.object({
        questionKey: z.string().min(1),
        answerKey: z.string().min(1),
      }),
    )
    .min(1),
});

const financeSchema = z.object({
  amount: z.number(),
  description: z.string().optional(),
});

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
  worldConfig: WorldGenerationConfig = DEFAULT_WORLD_CONFIG,
  bootGate: Promise<unknown> = Promise.resolve(null),
): void {
  const saveRepo = new PrismaSaveGameRepository(prisma);
  const progressionRepo = new PrismaProgressionRepository(prisma);
  const eventRepo = new PrismaEventRepository(prisma);
  const editorRepo = new PrismaEditorRepository(prisma);
  const financeRepo = new PrismaFinanceRepository(prisma);
  const worldRepo = new PrismaWorldRepository(prisma);
  const careerRepo = new PrismaCareerRepository(prisma);
  const shopRepo = new PrismaShopRepository(prisma);
  const profileRepo = new PrismaProfileRepository(prisma);
  const cupRepo = new PrismaCupRepository(prisma);
  const cupDeps = { repository: cupRepo, config: DEFAULT_MATCH_CONFIG };
  const continentalRepo = new PrismaContinentalRepository(prisma);
  const continentalDeps = {
    repository: continentalRepo,
    config: DEFAULT_MATCH_CONFIG,
    qualifiersPerCountry: 4,
  };
  const nationalTeamRepo = new PrismaNationalTeamRepository(prisma);
  const nationalTeamDeps = {
    repository: nationalTeamRepo,
    config: DEFAULT_MATCH_CONFIG,
    squadSize: 23,
  };
  const awardsRepo = new PrismaAwardsRepository(prisma);
  const careerTimelineRepo = new PrismaCareerTimelineRepository(prisma);
  const standingsRepo = new PrismaStandingsRepository(prisma);
  const seasonRolloverRepo = new PrismaSeasonRolloverRepository(prisma);
  const seasonRolloverDeps = { repository: seasonRolloverRepo };
  const npcAgingDeps = {
    repository: new PrismaNpcAgingRepository(prisma),
    progressionConfig: DEFAULT_PROGRESSION_CONFIG,
    retirementConfig: DEFAULT_RETIREMENT_CONFIG,
    worldConfig,
  };
  const youthIntakeDeps = {
    intake: new PrismaYouthIntakeRepository(prisma),
    aging: npcAgingDeps.repository,
    worldConfig,
  };
  const competitionCalendarRepo = new PrismaCompetitionCalendarRepository(
    prisma,
  );
  const resolveCompetitionsDeps = {
    calendarRepository: competitionCalendarRepo,
    cupDeps,
    continentalDeps,
    nationalTeamDeps,
    profileRepository: profileRepo,
  };
  const nationalCallupDeps = {
    calendar: competitionCalendarRepo,
    nationalTeam: nationalTeamRepo,
    profile: profileRepo,
    squadSize: 23,
  };
  const matchdayRepo = new PrismaMatchdayRepository(prisma);
  const matchdayDeps = {
    repository: matchdayRepo,
    config: DEFAULT_MATCH_CONFIG,
  };
  const managerStatusRepo = new PrismaManagerStatusRepository(prisma);
  const managerTrustDeps = { profile: profileRepo, status: managerStatusRepo };
  const nextFixtureRepo = new PrismaNextFixtureRepository(prisma);
  const matchPlanDeps = { profile: profileRepo, nextFixture: nextFixtureRepo };
  const transferMarketRepo = new PrismaTransferMarketRepository(prisma);
  const newsRepo = new PrismaNewsRepository(prisma);
  const newsDeps = { repository: newsRepo };

  const interviewRepo = new PrismaInterviewRepository(prisma);
  const interviewDeps = { repo: interviewRepo, news: newsRepo };
  const seasonReviewRepo = new PrismaSeasonReviewRepository(prisma);
  // "Mister {lastName}" candidates per country for dugout churn.
  const managerNamePools = Object.fromEntries(
    Object.entries(worldConfig.namePools).map(([countryId, pool]) => [
      countryId,
      pool.lastNames.map((lastName) => `Mister ${lastName}`),
    ]),
  );
  const seasonReviewDeps = {
    repository: seasonReviewRepo,
    managerNamePools,
  };
  const postMatchDeps = { profile: profileRepo, interview: interviewRepo };
  const careerStatsRepo = new PrismaCareerStatsRepository(prisma);
  const careerLegacyDeps = {
    stats: careerStatsRepo,
    timeline: careerTimelineRepo,
  };
  const scoutingRepo = new PrismaScoutingRepository(prisma);
  const scoutingDeps = {
    scouting: scoutingRepo,
    profile: profileRepo,
    career: careerRepo,
  };
  const tacticsRepo = new PrismaTacticsRepository(prisma);
  const tacticsDeps = {
    tactics: tacticsRepo,
    profile: profileRepo,
    matchConfig: DEFAULT_MATCH_CONFIG,
  };
  const calendarDeps = { calendar: new PrismaCalendarRepository(prisma) };
  const worldEditorDeps = { world: new PrismaWorldEditorRepository(prisma) };

  // Background cleanup of soft-deleted saves: never awaited by a request,
  // never runs twice concurrently, retriggered by each DELETE and at boot —
  // but always AFTER the boot backup (bootGate) has secured a snapshot.
  let purgeRunning = false;
  const schedulePurge = (): void => {
    if (purgeRunning) return;
    purgeRunning = true;
    void bootGate
      .then(() => saveRepo.purgeDeletedSaves())
      .then((count) => {
        if (count > 0) app.log.info(`Purged ${count} deleted save(s)`);
      })
      .catch((error) => app.log.error(error, 'Deleted-save purge failed'))
      .finally(() => {
        purgeRunning = false;
      });
  };
  schedulePurge();
  const agentDeps = {
    repository: careerRepo,
    config: DEFAULT_CAREER_CONFIG,
    profileRepo,
    financeRepo,
  };

  function sendAgentResult(reply: FastifyReply, result: AgentActionResult) {
    if (result.status === 'no-agent') {
      return reply.code(409).send({ error: 'NoAgent' });
    }
    if (result.status === 'no-contract') {
      return reply.code(409).send({ error: 'NoContract' });
    }
    if (result.status === 'save-not-found') {
      return reply.code(404).send({ error: 'NotFound' });
    }
    return reply.send(result);
  }
  const careerDeps = { repository: careerRepo, config: DEFAULT_CAREER_CONFIG };
  const presentationDeps = {
    career: careerRepo,
    profile: profileRepo,
    editor: editorRepo,
    saveGame: saveRepo,
  };
  const ceremonyDeps = {
    timeline: careerTimelineRepo,
    profile: profileRepo,
    editor: editorRepo,
  };
  const eventDeps = { repository: eventRepo, definitions: EVENT_DEFINITIONS };
  const seasonSummaryRepo = new PrismaSeasonSummaryRepository(prisma);
  const loanDeps = {
    loans: new PrismaLoanRepository(prisma),
    profile: profileRepo,
  };
  const leagueContextRepo = new PrismaLeagueContextRepository(prisma);
  const naturalizationDeps = {
    naturalization: new PrismaNaturalizationRepository(prisma),
    profile: profileRepo,
  };
  // One in-game week, shared by the weekly advance and the season fast-forward.
  const weeklyCycleDeps = {
    advance: {
      repository: progressionRepo,
      config: DEFAULT_PROGRESSION_CONFIG,
      wellbeingConfig: DEFAULT_WELLBEING_CONFIG,
      retirementConfig: DEFAULT_RETIREMENT_CONFIG,
      injuryTypeKeys,
    },
    matchday: matchdayDeps,
    nationalCallup: nationalCallupDeps,
    resolveCompetitions: resolveCompetitionsDeps,
    seasonRollover: seasonRolloverDeps,
    npcAging: npcAgingDeps,
    seasonReview: seasonReviewDeps,
    transferMarket: { repository: transferMarketRepo },
    youthIntake: youthIntakeDeps,
    scouting: scoutingDeps,
    managerTrust: managerTrustDeps,
    postMatch: postMatchDeps,
    events: eventDeps,
    news: newsDeps,
    loans: loanDeps,
    naturalization: naturalizationDeps,
    profile: profileRepo,
    newsRepo,
    leagueContext: leagueContextRepo,
  };

  app.post('/api/saves', async (request, reply) => {
    const input = parseBody(newGameInputSchema, request.body, reply);
    if (!input) return reply;
    let game = await createNewGame({ repository: saveRepo }, input);
    // Generate a full world (leagues, clubs, squads, fixtures) so the player
    // can choose a starting club and negotiate transfers.
    const countries = COUNTRIES.filter(
      (country) => worldConfig.namePools[country.id],
    );
    await generateAndPersistWorld(
      { worldRepository: worldRepo },
      {
        saveGameId: game.save.id,
        seed: game.save.seed,
        countries,
        config: worldConfig,
      },
    );
    // Quick starts with an auto-sign land the career at a fitting club right
    // away; CLASSIC leaves the choice to the player (historic behaviour).
    const quickStart = quickStartOf(input.quickStart);
    if (quickStart.autoSign) {
      const clubId = pickAutoSignClub(
        await careerRepo.listClubDirectory(game.save.id),
        input.player.nationalityId,
        quickStart.autoSign,
      );
      if (clubId) {
        const signed = await signWithClub(careerDeps, {
          saveGameId: game.save.id,
          clubId,
        });
        if (signed && signed.signingBonus > 0) {
          await grantFunds(
            { repository: financeRepo },
            {
              saveGameId: game.save.id,
              amount: signed.signingBonus,
              description: 'Bonus alla firma',
            },
          );
        }
        game = (await loadGame(saveRepo, game.save.id)) ?? game;
      }
    }
    return reply.code(201).send(game);
  });

  app.get('/api/quick-starts', async () => QUICK_STARTS);

  app.post('/api/saves/:id/loan', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(loanDecisionSchema, request.body, reply);
    if (!body) return reply;
    const result = await decideLoan(loanDeps, { saveGameId: id, ...body });
    if (result.status === 'no-offer') {
      return reply.code(409).send({ error: 'NoLoanOffer' });
    }
    if (result.status === 'invalid-club') {
      return reply.code(400).send({ error: 'InvalidClub' });
    }
    return reply.send(result);
  });

  app.get('/api/saves/:id/world', async (request, reply) => {
    const { id } = request.params as { id: string };
    const world = await getEditableWorld(worldEditorDeps, id);
    if (!world) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(world);
  });

  app.post('/api/saves/:id/world/club/:clubId', async (request, reply) => {
    const { id, clubId } = request.params as { id: string; clubId: string };
    const body = parseBody(clubEditSchema, request.body, reply);
    if (!body) return reply;
    const updated = await editClub(worldEditorDeps, {
      saveGameId: id,
      clubId,
      ...body,
    });
    if (!updated) return reply.code(404).send({ error: 'ClubNotFound' });
    return reply.send({ ok: true });
  });

  app.post(
    '/api/saves/:id/world/competition/:competitionId',
    async (request, reply) => {
      const { id, competitionId } = request.params as {
        id: string;
        competitionId: string;
      };
      const body = parseBody(competitionEditSchema, request.body, reply);
      if (!body) return reply;
      const updated = await editCompetition(worldEditorDeps, {
        saveGameId: id,
        competitionId,
        ...body,
      });
      if (!updated) {
        return reply.code(404).send({ error: 'CompetitionNotFound' });
      }
      return reply.send({ ok: true });
    },
  );

  app.get('/api/saves/:id/clubs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    let clubs = await listClubs(careerRepo, id);
    if (clubs.length === 0) {
      // Legacy save created before world generation existed: backfill it now.
      const countries = COUNTRIES.filter(
        (country) => worldConfig.namePools[country.id],
      );
      await generateAndPersistWorld(
        { worldRepository: worldRepo },
        {
          saveGameId: id,
          seed: game.save.seed,
          countries,
          config: worldConfig,
        },
      );
      clubs = await listClubs(careerRepo, id);
    }
    return reply.send(clubs);
  });

  app.get('/api/saves/:id/offers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const offers = await listProtagonistOffers(careerRepo, id);
    if (!offers) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(offers);
  });

  app.post('/api/saves/:id/offers/:offerId/respond', async (request, reply) => {
    const { id, offerId } = request.params as {
      id: string;
      offerId: string;
    };
    const body = parseBody(respondOfferSchema, request.body, reply);
    if (!body) return reply;
    const result = await respondToOffer(careerDeps, {
      saveGameId: id,
      offerId,
      accept: body.accept,
    });
    if (!result) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(result);
  });

  app.post('/api/saves/:id/sign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(signSchema, request.body, reply);
    if (!body) return reply;
    const result = await signWithClub(careerDeps, {
      saveGameId: id,
      clubId: body.clubId,
    });
    if (!result) return reply.code(404).send({ error: 'ClubNotFound' });
    // Credit the signing bonus to the wallet.
    let balance: number | null = null;
    if (result.signingBonus > 0) {
      balance = await grantFunds(
        { repository: financeRepo },
        {
          saveGameId: id,
          amount: result.signingBonus,
          description: 'Bonus alla firma',
        },
      );
    } else {
      balance = await getBalance({ repository: financeRepo }, id);
    }
    return reply.send({ ...result, balance });
  });

  app.get('/api/saves/:id/shop', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(listShopItems());
  });

  app.post('/api/saves/:id/shop/buy', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(buySchema, request.body, reply);
    if (!body) return reply;
    const result = await buyItem(
      { shopRepository: shopRepo, financeRepository: financeRepo },
      { saveGameId: id, itemKey: body.itemKey },
    );
    if (result.status === 'item-not-found') {
      return reply.code(404).send({ error: 'ItemNotFound' });
    }
    if (result.status === 'save-not-found') {
      return reply.code(404).send({ error: 'NotFound' });
    }
    if (result.status === 'insufficient') {
      return reply.code(409).send({
        error: 'InsufficientFunds',
        balance: result.balance,
        price: result.price,
      });
    }
    return reply.send({ balance: result.balance, item: result.item });
  });

  app.get('/api/saves/:id/agents', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await listAgents(profileRepo, id);
    if (!result) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(result);
  });

  app.post('/api/saves/:id/agent', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(chooseAgentSchema, request.body, reply);
    if (!body) return reply;
    const result = await chooseAgent(profileRepo, {
      saveGameId: id,
      agentKey: body.agentKey,
    });
    if (result.status === 'not-found') {
      return reply.code(404).send({ error: 'AgentNotFound' });
    }
    if (result.status === 'save-not-found') {
      return reply.code(404).send({ error: 'NotFound' });
    }
    return reply.send({ agentKey: body.agentKey });
  });

  app.post('/api/saves/:id/agent/negotiate-wage', async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendAgentResult(
      reply,
      await negotiateWage(agentDeps, { saveGameId: id }),
    );
  });

  app.post('/api/saves/:id/agent/request', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(agentRequestSchema, request.body, reply);
    if (!body) return reply;
    return sendAgentResult(
      reply,
      await requestFromAgent(agentDeps, { saveGameId: id, type: body.type }),
    );
  });

  app.get('/api/saves/:id/avatar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await profileRepo.getProfile(id);
    if (!profile) return reply.code(404).send({ error: 'NotFound' });
    return reply.send({ avatarDataUrl: profile.avatarDataUrl });
  });

  app.post('/api/saves/:id/avatar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(avatarSchema, request.body, reply);
    if (!body) return reply;
    const ok = await profileRepo.setAvatar(id, body.dataUrl ?? null);
    if (!ok) return reply.code(404).send({ error: 'NotFound' });
    return reply.send({ avatarDataUrl: body.dataUrl ?? null });
  });

  app.get('/api/saves/:id/lifestyles', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await listLifestyles(profileRepo, id);
    if (!result) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(result);
  });

  app.post('/api/saves/:id/lifestyle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(lifestyleSchema, request.body, reply);
    if (!body) return reply;
    const result = await chooseLifestyle(profileRepo, {
      saveGameId: id,
      lifestyle: body.lifestyle,
    });
    if (result.status === 'not-found') {
      return reply.code(404).send({ error: 'LifestyleNotFound' });
    }
    if (result.status === 'save-not-found') {
      return reply.code(404).send({ error: 'NotFound' });
    }
    return reply.send({ lifestyle: body.lifestyle });
  });

  app.get('/api/saves/:id/interview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await getInterviewSession(interviewDeps, id);
    if (!session) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(session);
  });

  app.post('/api/saves/:id/interview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(interviewSchema, request.body, reply);
    if (!body) return reply;
    const result = await submitInterview(interviewDeps, {
      saveGameId: id,
      answers: body.answers,
    });
    if (result.status === 'save-not-found') {
      return reply.code(404).send({ error: 'NotFound' });
    }
    if (result.status === 'already-done') {
      return reply.code(409).send({ error: 'AlreadyInterviewed' });
    }
    return reply.send({ deltas: result.deltas, stats: result.stats });
  });

  app.get('/api/saves/:id/cups', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(await listCups(cupRepo, id));
  });

  app.post(
    '/api/saves/:id/cups/:competitionId/simulate',
    async (request, reply) => {
      const { id, competitionId } = request.params as {
        id: string;
        competitionId: string;
      };
      const result = await simulateNationalCup(cupDeps, {
        saveGameId: id,
        competitionId,
      });
      if (!result) return reply.code(404).send({ error: 'CupNotFound' });
      return reply.send(result);
    },
  );

  app.get('/api/saves/:id/honours', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(await listHonours(cupRepo, id));
  });

  app.get('/api/saves/:id/continental', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(await getContinental(continentalRepo, id));
  });

  app.post('/api/saves/:id/continental/simulate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await simulateContinental(continentalDeps, {
      saveGameId: id,
    });
    if (!result) return reply.code(404).send({ error: 'ContinentalNotFound' });
    return reply.send(result);
  });

  app.get('/api/saves/:id/national-team', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(await getNationalTeamTournament(nationalTeamRepo, id));
  });

  app.post('/api/saves/:id/national-team/simulate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await simulateNationalTeamTournament(nationalTeamDeps, {
      saveGameId: id,
    });
    if (!result) return reply.code(404).send({ error: 'NationalTeamNotFound' });
    return reply.send(result);
  });

  app.post('/api/saves/:id/awards/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await assignSeasonAwards(awardsRepo, id);
    if (!result) return reply.code(404).send({ error: 'NoCompletedSeason' });
    return reply.send(result);
  });

  app.get('/api/saves/:id/season-stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stats = await getSeasonStats(careerStatsRepo, id);
    if (!stats) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(stats);
  });

  app.get('/api/saves/:id/legacy', async (request, reply) => {
    const { id } = request.params as { id: string };
    const legacy = await getCareerLegacy(careerLegacyDeps, id);
    if (!legacy) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(legacy);
  });

  app.get('/api/saves/:id/career-timeline', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    const events = await buildCareerTimeline(careerTimelineRepo, id);
    return reply.send(events ?? []);
  });

  app.get('/api/saves/:id/standings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(await getStandings(standingsRepo, id));
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

  app.delete('/api/saves/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await removeSave(saveRepo, id);
    if (!deleted) return reply.code(404).send({ error: 'NotFound' });
    // Heavy row cleanup runs in the background; the save is already hidden.
    schedulePurge();
    return reply.send({ deleted: true });
  });

  app.get('/api/saves/:id/dashboard', async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    const pendingEvents = await eventRepo.listPendingEvents(id);
    const protagonist = await progressionRepo.loadProtagonist(id);
    const activeInjury = protagonist?.activeInjury
      ? {
          ...protagonist.activeInjury,
          typeName:
            INJURY_TYPES.find(
              (t) => t.key === protagonist.activeInjury!.typeKey,
            )?.name ?? protagonist.activeInjury.typeKey,
          bodyArea:
            INJURY_TYPES.find(
              (t) => t.key === protagonist.activeInjury!.typeKey,
            )?.bodyArea ?? null,
        }
      : null;
    const managerStatus = await getManagerStatus(
      profileRepo,
      managerStatusRepo,
      id,
    );
    const postMatch = await getPendingPostMatch(postMatchDeps, id);
    const scoutWatchers = await getScoutWatchers(scoutingDeps, id);
    const profileForCallup = await profileRepo.getProfile(id);
    const nationalCallup =
      profileForCallup?.nationalCallup &&
      profileForCallup.nationalCallup.status !== 'NOT_CALLED'
        ? profileForCallup.nationalCallup
        : null;
    const loanOffer =
      profileForCallup?.loanOffer?.status === 'PENDING'
        ? profileForCallup.loanOffer
        : null;
    return reply.send({
      save: game.save,
      player: game.player,
      pendingEvents,
      activeInjury,
      managerStatus,
      postMatch,
      scoutWatchers,
      nationalCallup,
      loanOffer,
      activeLoan: profileForCallup?.activeLoan ?? null,
      leagueSpotlight: await getLeagueSpotlight(leagueContextRepo, id),
      naturalization:
        profileForCallup?.naturalization?.status === 'PENDING'
          ? profileForCallup.naturalization
          : null,
    });
  });

  app.get('/api/saves/:id/news', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await getNews(newsDeps, id));
  });

  app.post('/api/saves/:id/news/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    await markNewsRead(newsDeps, id);
    return reply.send({ ok: true });
  });

  app.post('/api/saves/:id/national-callup', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(callupSchema, request.body, reply);
    if (!body) return reply;
    const result = await decideNationalCallup(
      {
        profile: profileRepo,
        interview: interviewRepo,
        naturalization: naturalizationDeps.naturalization,
      },
      { saveGameId: id, accept: body.accept },
    );
    if (result.status === 'no-pending') {
      return reply.code(409).send({ error: 'NoPendingCallup' });
    }
    return reply.send(result.callup);
  });

  // The unveiling at a new club. Derived, not signalled: see
  // `application/club-presentation.ts` for why nothing calls this on signing.
  app.get('/api/saves/:id/presentation', async (request, reply) => {
    const { id } = request.params as { id: string };
    const presentation = await getClubPresentation(presentationDeps, id);
    return reply.send({ presentation });
  });

  app.post('/api/saves/:id/presentation/seen', async (request, reply) => {
    const { id } = request.params as { id: string };
    const marked = await markPresentationSeen(presentationDeps, id);
    if (!marked) return reply.code(404).send({ error: 'NoClub' });
    return reply.send({ ok: true });
  });

  // The trophy ceremony, derived from the honours the protagonist can claim.
  app.get('/api/saves/:id/ceremony', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ceremony = await getAwardCeremony(ceremonyDeps, id);
    return reply.send({ ceremony });
  });

  app.post('/api/saves/:id/ceremony/seen', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(ceremonySeenSchema, request.body, reply);
    if (!body) return reply;
    const marked = await markCeremonySeen(ceremonyDeps, id, body.honourId);
    if (!marked) return reply.code(404).send({ error: 'NotFound' });
    return reply.send({ ok: true });
  });

  app.post('/api/saves/:id/naturalization', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(callupSchema, request.body, reply);
    if (!body) return reply;
    const game = await loadGame(saveRepo, id);
    if (!game) return reply.code(404).send({ error: 'NotFound' });
    const result = await decideNaturalization(naturalizationDeps, {
      saveGameId: id,
      accept: body.accept,
      gameDate: new Date(game.save.currentDate),
    });
    if (result.status === 'no-pending') {
      return reply.code(409).send({ error: 'NoPendingNaturalization' });
    }
    await recordNews(newsDeps, id, result.news ?? []);
    if (result.status === 'blocked') {
      return reply.code(409).send({
        error: 'NaturalizationNoLongerAllowed',
        naturalization: result.naturalization,
      });
    }
    return reply.send(result.naturalization);
  });

  app.get('/api/saves/:id/tactics', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await getTactics(tacticsDeps, id));
  });

  app.post('/api/saves/:id/tactics', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(instructionsSchema, request.body, reply);
    if (!body) return reply;
    const result = await setInstructions(tacticsDeps, id, body);
    if (result === 'invalid') {
      return reply.code(400).send({ error: 'InvalidInstructions' });
    }
    return reply.send({ ok: true });
  });

  app.get('/api/saves/:id/calendar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { month } = request.query as { month?: string };
    const view = await getCalendarMonth(calendarDeps, {
      saveGameId: id,
      month,
    });
    if (!view) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(view);
  });

  app.get('/api/saves/:id/next-fixture', async (request, reply) => {
    const { id } = request.params as { id: string };
    const fixture = await getNextFixture(matchPlanDeps, id);
    return reply.send(fixture);
  });

  app.post('/api/saves/:id/match-plan', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(matchPlanSchema, request.body, reply);
    if (!body) return reply;
    const result = await saveMatchPlan(matchPlanDeps, id, body);
    if (result.status === 'no-fixture') {
      return reply.code(404).send({ error: 'NoFixture' });
    }
    if (result.status === 'bad-approach') {
      return reply.code(400).send({ error: 'BadApproach' });
    }
    return reply.send({ ok: true });
  });

  app.post('/api/saves/:id/injury/treatment', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(injuryTreatmentSchema, request.body, reply);
    if (!body) return reply;
    const result = await chooseInjuryTreatment(
      {
        repository: progressionRepo,
        wellbeingConfig: DEFAULT_WELLBEING_CONFIG,
      },
      { saveGameId: id, choice: body.choice },
    );
    if (!result) return reply.code(400).send({ error: 'NoTreatableInjury' });
    return reply.send(result);
  });

  app.post('/api/saves/:id/advance-week', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(advanceWeekSchema, request.body ?? {}, reply);
    if (!body) return reply;

    const result = await runWeeklyCycle(weeklyCycleDeps, {
      saveGameId: id,
      ...body,
    });
    if (!result) return reply.code(404).send({ error: 'NotFound' });
    return reply.send(result);
  });

  app.post('/api/saves/:id/simulate-season', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(advanceWeekSchema, request.body ?? {}, reply);
    if (!body) return reply;

    const summary = await simulateToSeasonEnd(
      {
        cycle: weeklyCycleDeps,
        summary: seasonSummaryRepo,
        profile: profileRepo,
      },
      {
        saveGameId: id,
        ...(body.intensity !== undefined ? { intensity: body.intensity } : {}),
      },
    );
    if (summary === 'not-found') {
      return reply.code(404).send({ error: 'NotFound' });
    }
    if (summary === 'no-club') {
      return reply.code(409).send({ error: 'NoClub' });
    }
    const unreadNews = await newsRepo.countUnread(id);
    return reply.send({ ...summary, unreadNews });
  });

  app.post('/api/saves/:id/post-match', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(postMatchSchema, request.body, reply);
    if (!body) return reply;
    const result = await answerPostMatch(postMatchDeps, {
      saveGameId: id,
      answerKey: body.answerKey,
    });
    if (result.status === 'no-pending') {
      return reply.code(404).send({ error: 'NoPendingPostMatch' });
    }
    if (result.status === 'bad-answer') {
      return reply.code(400).send({ error: 'BadAnswer' });
    }
    return reply.send(result.stats);
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

  app.get('/api/saves/:id/finance', async (request, reply) => {
    const { id } = request.params as { id: string };
    const balance = await getBalance({ repository: financeRepo }, id);
    if (balance === null) return reply.code(404).send({ error: 'NotFound' });
    return reply.send({ balance });
  });

  app.post('/api/saves/:id/finance', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(financeSchema, request.body, reply);
    if (!body) return reply;
    const balance = await grantFunds(
      { repository: financeRepo },
      {
        saveGameId: id,
        amount: body.amount,
        description: body.description,
      },
    );
    if (balance === null) return reply.code(404).send({ error: 'NotFound' });
    return reply.send({ balance });
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
