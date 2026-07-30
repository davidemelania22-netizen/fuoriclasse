import type {
  EventConsequence,
  EventContext,
  EventGamble,
} from '@football-life/shared';
import type {
  CooldownState,
  EventEffectState,
} from '@football-life/simulation-engine';

/**
 * A choice as the player sees it: the label, what it costs or gives for
 * certain, and — when it is a gamble — the odds, declared up front.
 */
export interface EventChoiceView {
  key: string;
  label: string;
  consequences: EventConsequence;
  gamble?: EventGamble;
}

export interface EventGenerationContext {
  context: EventContext;
  seed: string;
  playerId: string;
  currentDate: Date;
}

export interface PlayerEffectSnapshot extends EventEffectState {
  playerId: string;
  saveGameId: string;
  currentDate: Date;
  /** Save seed, so a gamble's roll is reproducible for this career. */
  seed: string;
}

export interface CreatePendingEventInput {
  saveGameId: string;
  definitionKey: string;
  category: string;
  title: string;
  description: string;
  occurredAt: Date;
  choices: EventChoiceView[];
}

export interface PendingEventRecord {
  id: string;
  definitionKey: string;
  status: string;
}

export interface PendingEventView {
  id: string;
  definitionKey: string;
  category: string;
  title: string;
  description: string;
  choices: EventChoiceView[];
}

export interface ApplyEventOutcomeInput {
  saveGameId: string;
  playerId: string;
  gameEventId: string;
  choiceKey: string;
  occurredAt: Date;
  description: string;
  effect: EventEffectState;
  /** How a declared-odds choice turned out, kept so the story is not lost. */
  outcomeLabel?: string | undefined;
}

export interface EventRepository {
  loadEventContext(saveGameId: string): Promise<EventGenerationContext | null>;
  loadCooldowns(saveGameId: string): Promise<CooldownState>;
  loadPlayerEffectState(
    saveGameId: string,
  ): Promise<PlayerEffectSnapshot | null>;
  createPendingEvent(input: CreatePendingEventInput): Promise<string>;
  recordCooldown(
    saveGameId: string,
    definitionId: string,
    occurredAt: Date,
    nextEligibleAt: Date,
  ): Promise<void>;
  getPendingEvent(gameEventId: string): Promise<PendingEventRecord | null>;
  listPendingEvents(saveGameId: string): Promise<PendingEventView[]>;
  applyEventOutcome(input: ApplyEventOutcomeInput): Promise<void>;
}
