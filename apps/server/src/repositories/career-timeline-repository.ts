export interface CareerContractRecord {
  clubId: string;
  clubName: string;
  startDate: string;
}

export interface CareerAppearanceRecord {
  date: string;
  clubId: string;
  clubName: string;
  opponentName: string;
  goals: number;
  assists: number;
  rating: number;
}

export interface CareerHonourRecord {
  id: string;
  type: string;
  clubId: string | null;
  clubName: string | null;
  playerId: string | null;
  seasonLabel: string;
  competitionName: string | null;
  createdAt: string;
}

export interface CareerTimelineData {
  playerId: string;
  nationalityId: string;
  /** Ordered by startDate ascending. */
  contracts: CareerContractRecord[];
  /** Ordered by fixture date ascending. */
  appearances: CareerAppearanceRecord[];
  honours: CareerHonourRecord[];
}

export interface CareerTimelineRepository {
  loadCareerTimelineData(
    saveGameId: string,
  ): Promise<CareerTimelineData | null>;
}
