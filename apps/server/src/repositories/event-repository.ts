import type { EventContext } from '@football-life/shared';
import type {
  CooldownState,
  EventEffectState,
} from '@football-life/simulation-engine';

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
}

export interface CreatePendingEventInput {
  saveGameId: string;
  definitionKey: string;
  category: string;
  title: string;
  description: string;
  occurredAt: Date;
  choices: { key: string; label: string }[];
}

export interface PendingEventRecord {
  id: string;
  definitionKey: string;
  status: string;
}

export interface ApplyEventOutcomeInput {
  saveGameId: string;
  playerId: string;
  gameEventId: string;
  choiceKey: string;
  occurredAt: Date;
  description: string;
  effect: EventEffectState;
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
  applyEventOutcome(input: ApplyEventOutcomeInput): Promise<void>;
}
