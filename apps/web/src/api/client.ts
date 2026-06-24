import type {
  EditablePlayer,
  LoadedGame,
  NewGameInput,
  PlayerEditInput,
  PlayerSummary,
  SaveGameSummary,
  TrainingIntensity,
} from '@football-life/shared';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(response.status, body?.error ?? response.statusText);
  }
  return (await response.json()) as T;
}

export interface PendingEventView {
  id: string;
  definitionKey: string;
  category: string;
  title: string;
  description: string;
  choices: { key: string; label: string }[];
}

export interface DashboardResponse {
  save: SaveGameSummary;
  player: PlayerSummary;
  pendingEvents: PendingEventView[];
}

export interface WeeklyAdvanceReport {
  weeksAdvanced: number;
  seasonsCrossed: number;
  ageAfter: number;
  abilityBefore: number;
  abilityAfter: number;
  fatigue: number;
  condition: number;
  morale: number;
  stress: number;
  injured: boolean;
  injuriesSustained: number;
  newCurrentDate: string;
}

export interface GeneratedEvent {
  gameEventId: string;
  definitionId: string;
  title: string;
  description: string;
  choices: { key: string; label: string }[];
}

export interface AdvanceResponse {
  report: WeeklyAdvanceReport;
  event: GeneratedEvent | null;
}

export interface AdvanceWeekBody {
  weeks?: number;
  intensity?: TrainingIntensity;
}

export const api = {
  listSaves: () => http<SaveGameSummary[]>('/saves'),
  createSave: (input: NewGameInput) =>
    http<LoadedGame>('/saves', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getDashboard: (id: string) =>
    http<DashboardResponse>(`/saves/${id}/dashboard`),
  advanceWeek: (id: string, body: AdvanceWeekBody) =>
    http<AdvanceResponse>(`/saves/${id}/advance-week`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  chooseEvent: (id: string, eventId: string, choiceKey: string) =>
    http<{
      morale: number;
      stress: number;
      reputation: number;
      moneyDelta: number;
    }>(`/saves/${id}/events/${eventId}/choose`, {
      method: 'POST',
      body: JSON.stringify({ choiceKey }),
    }),
  getEditablePlayer: (id: string) =>
    http<EditablePlayer>(`/saves/${id}/editable-player`),
  editPlayer: (id: string, edits: PlayerEditInput) =>
    http<EditablePlayer>(`/saves/${id}/player`, {
      method: 'PATCH',
      body: JSON.stringify(edits),
    }),
};
