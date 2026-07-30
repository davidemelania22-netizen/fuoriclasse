import type {
  MarketClub,
  MarketPlayer,
  PlannedTransfer,
} from '@football-life/simulation-engine';

export interface MarketState {
  seed: string;
  clubs: MarketClub[];
  players: MarketPlayer[];
}

export interface TransferMarketRepository {
  /** Clubs and non-protagonist players available to the AI market. */
  loadMarketState(saveGameId: string): Promise<MarketState | null>;
  /** Move players and settle fees between club balances. */
  applyTransfers(transfers: readonly PlannedTransfer[]): Promise<void>;
}
