import type { InterviewEffect } from '@football-life/shared';

export interface InterviewContext {
  firstName: string;
  clubName: string;
  weekIndex: number;
  lastInterviewWeek: number | null;
}

export interface InterviewStats {
  morale: number;
  stress: number;
  happiness: number;
  mentalHealth: number;
  motivation: number;
  popularity: number;
  reputation: number;
}

export interface InterviewRepository {
  loadContext(saveGameId: string): Promise<InterviewContext | null>;
  /** Apply clamped deltas to the protagonist and stamp the interview week. */
  applyInterview(
    saveGameId: string,
    deltas: InterviewEffect,
    weekIndex: number,
  ): Promise<InterviewStats | null>;
  /** Apply clamped deltas WITHOUT stamping the weekly-interview slot. */
  applyStatDeltas(
    saveGameId: string,
    deltas: InterviewEffect,
  ): Promise<InterviewStats | null>;
}
