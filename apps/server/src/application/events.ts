import type { GameEventDefinition } from '@football-life/shared';
import {
  applyConsequence,
  createRandomSource,
  getChoice,
  selectEvent,
} from '@football-life/simulation-engine';
import type { EventRepository } from '../repositories/event-repository';

const WEEK_MS = 7 * 86_400_000;

export interface EventDeps {
  repository: EventRepository;
  definitions: readonly GameEventDefinition[];
}

export interface GeneratedEvent {
  gameEventId: string;
  definitionId: string;
  title: string;
  description: string;
  choices: { key: string; label: string }[];
}

export async function generateWeeklyEvent(
  deps: EventDeps,
  input: { saveGameId: string },
): Promise<GeneratedEvent | null> {
  const generation = await deps.repository.loadEventContext(input.saveGameId);
  if (!generation) return null;

  const cooldowns = await deps.repository.loadCooldowns(input.saveGameId);
  const rng = createRandomSource(
    `${generation.seed}:event:${generation.context.weekIndex}`,
  );
  const definition = selectEvent(
    deps.definitions,
    generation.context,
    cooldowns,
    rng,
  );
  if (!definition) return null;

  const choices = definition.choices.map((choice) => ({
    key: choice.key,
    label: choice.label,
  }));
  const gameEventId = await deps.repository.createPendingEvent({
    saveGameId: input.saveGameId,
    definitionKey: definition.id,
    category: definition.category,
    title: definition.title,
    description: definition.descriptionTemplate,
    occurredAt: generation.currentDate,
    choices,
  });

  const nextEligibleAt = new Date(
    generation.currentDate.getTime() + definition.cooldownWeeks * WEEK_MS,
  );
  await deps.repository.recordCooldown(
    input.saveGameId,
    definition.id,
    generation.currentDate,
    nextEligibleAt,
  );

  return {
    gameEventId,
    definitionId: definition.id,
    title: definition.title,
    description: definition.descriptionTemplate,
    choices,
  };
}

export interface ResolveEventResult {
  morale: number;
  stress: number;
  reputation: number;
  moneyDelta: number;
}

export async function resolvePendingEvent(
  deps: EventDeps,
  input: { saveGameId: string; gameEventId: string; choiceKey: string },
): Promise<ResolveEventResult | null> {
  const pending = await deps.repository.getPendingEvent(input.gameEventId);
  if (!pending || pending.status !== 'PENDING') {
    return null;
  }

  const definition = deps.definitions.find(
    (candidate) => candidate.id === pending.definitionKey,
  );
  if (!definition) return null;

  const state = await deps.repository.loadPlayerEffectState(input.saveGameId);
  if (!state) return null;

  const choice = getChoice(definition, input.choiceKey);
  const effect = applyConsequence(
    {
      morale: state.morale,
      stress: state.stress,
      happiness: state.happiness,
      mentalHealth: state.mentalHealth,
      motivation: state.motivation,
      reputation: state.reputation,
      popularity: state.popularity,
      moneyDelta: 0,
    },
    choice.consequences,
  );

  await deps.repository.applyEventOutcome({
    saveGameId: input.saveGameId,
    playerId: state.playerId,
    gameEventId: input.gameEventId,
    choiceKey: input.choiceKey,
    occurredAt: state.currentDate,
    description: `${definition.title}: ${choice.label}`,
    effect,
  });

  return {
    morale: effect.morale,
    stress: effect.stress,
    reputation: effect.reputation,
    moneyDelta: effect.moneyDelta,
  };
}
