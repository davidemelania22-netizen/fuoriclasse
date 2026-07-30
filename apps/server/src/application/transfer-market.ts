import {
  createRandomSource,
  selectTransfers,
} from '@football-life/simulation-engine';
import type { TransferMarketRepository } from '../repositories/transfer-market-repository';

/** How many NPC moves a single between-seasons window can produce. */
const MAX_TRANSFERS = 12;

export interface AppliedTransfer {
  playerName: string;
  fromClubName: string;
  toClubName: string;
  fee: number;
  ability: number;
}

export interface TransferMarketDeps {
  repository: TransferMarketRepository;
}

/**
 * Runs one between-seasons AI transfer window: richer, higher-reputation clubs
 * poach good players from weaker ones. Returns the applied moves (with names)
 * so the caller can turn them into news.
 */
export async function runTransferWindow(
  deps: TransferMarketDeps,
  input: { saveGameId: string; seasonLabel: string },
): Promise<AppliedTransfer[]> {
  const state = await deps.repository.loadMarketState(input.saveGameId);
  if (!state) return [];

  const rng = createRandomSource(
    `${state.seed}:transfers:${input.seasonLabel}`,
  );
  const transfers = selectTransfers(
    state.clubs,
    state.players,
    rng,
    MAX_TRANSFERS,
  );
  await deps.repository.applyTransfers(transfers);

  const clubName = new Map(state.clubs.map((c) => [c.id, c.name]));
  return transfers.map((t) => ({
    playerName: t.playerName,
    fromClubName: clubName.get(t.fromClubId) ?? '—',
    toClubName: clubName.get(t.toClubId) ?? '—',
    fee: t.fee,
    ability: t.ability,
  }));
}
