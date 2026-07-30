import type { GameEventDefinition } from '@football-life/shared';
import {
  applyConsequence,
  createRandomSource,
  getChoice,
  renderTemplate,
  resolveChoiceOutcome,
  selectEvent,
} from '@football-life/simulation-engine';
import type {
  EventChoiceView,
  EventRepository,
} from '../repositories/event-repository';

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
  choices: EventChoiceView[];
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

  const vars = generation.context as unknown as Record<
    string,
    string | number | boolean
  >;
  // Everything the choice does travels with it: the player decides knowing
  // both what it costs for certain and, for a gamble, the odds.
  const choices: EventChoiceView[] = definition.choices.map((choice) => ({
    key: choice.key,
    label: renderTemplate(choice.label, vars),
    consequences: choice.consequences,
    ...(choice.gamble ? { gamble: choice.gamble } : {}),
  }));
  const title = renderTemplate(definition.title, vars);
  const description = renderTemplate(definition.descriptionTemplate, vars);
  const gameEventId = await deps.repository.createPendingEvent({
    saveGameId: input.saveGameId,
    definitionKey: definition.id,
    category: definition.category,
    title,
    description,
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
    title,
    description,
    choices,
  };
}

export interface ResolveEventResult {
  morale: number;
  stress: number;
  reputation: number;
  moneyDelta: number;
  /** How the bet went, or null when the choice was a sure thing. */
  gamble: { succeeded: boolean; outcomeLabel: string } | null;
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
  // Seeded per event and choice: the same career always gets the same answer
  // from the dice, and it is the odds the player was shown that decide.
  const outcome = resolveChoiceOutcome(
    choice,
    createRandomSource(
      `${state.seed}:event-outcome:${input.gameEventId}:${input.choiceKey}`,
    ),
  );
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
    outcome.consequences,
  );

  await deps.repository.applyEventOutcome({
    saveGameId: input.saveGameId,
    playerId: state.playerId,
    gameEventId: input.gameEventId,
    choiceKey: input.choiceKey,
    occurredAt: state.currentDate,
    description: outcome.outcomeLabel
      ? `${definition.title}: ${choice.label} — ${outcome.outcomeLabel}`
      : `${definition.title}: ${choice.label}`,
    effect,
    ...(outcome.outcomeLabel ? { outcomeLabel: outcome.outcomeLabel } : {}),
  });

  return {
    morale: effect.morale,
    stress: effect.stress,
    reputation: effect.reputation,
    moneyDelta: effect.moneyDelta,
    gamble:
      outcome.succeeded === null || outcome.outcomeLabel === null
        ? null
        : { succeeded: outcome.succeeded, outcomeLabel: outcome.outcomeLabel },
  };
}
