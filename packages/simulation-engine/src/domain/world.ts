import type {
  AttributeCategory,
  CompetitionType,
  PlayerPosition,
  PreferredFoot,
} from '@football-life/shared';

export interface GeneratedAttribute {
  key: string;
  value: number;
  category: AttributeCategory;
}

export interface GeneratedPlayer {
  key: string;
  clubKey: string;
  firstName: string;
  lastName: string;
  nationalityId: string;
  birthDate: Date;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  preferredFoot: PreferredFoot;
  heightCm: number;
  weightKg: number;
  currentAbility: number;
  potentialAbility: number;
  reputation: number;
  marketValue: number;
  attributes: GeneratedAttribute[];
}

export interface GeneratedCoach {
  key: string;
  clubKey: string;
  firstName: string;
  lastName: string;
  nationalityId: string;
  birthDate: Date;
  archetype: string;
  personality: Record<string, number>;
}

export interface GeneratedClub {
  key: string;
  competitionKey: string;
  countryId: string;
  name: string;
  shortName: string;
  reputation: number;
  balance: number;
  wageBudget: number;
  transferBudget: number;
  academyQuality: number;
  trainingQuality: number;
  medicalQuality: number;
  scoutingQuality: number;
  pressureLevel: number;
  /** Derived target ability for the squad; consumed by later simulation. */
  strength: number;
}

export interface GeneratedCompetition {
  key: string;
  name: string;
  countryId: string;
  type: CompetitionType;
  tier: number;
  reputation: number;
  seasonStart: Date;
  seasonEnd: Date;
}

export interface GeneratedSeason {
  key: string;
  competitionKey: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface GeneratedFixture {
  seasonKey: string;
  matchday: number;
  homeClubKey: string;
  awayClubKey: string;
  scheduledAt: Date;
  importance: number;
}

export interface GeneratedWorld {
  competitions: GeneratedCompetition[];
  clubs: GeneratedClub[];
  coaches: GeneratedCoach[];
  players: GeneratedPlayer[];
  seasons: GeneratedSeason[];
  fixtures: GeneratedFixture[];
}
