import type { LoadedGame, SaveGameSummary } from '@football-life/shared';
import type { SaveGameRepository } from '../repositories/save-game-repository';

export async function loadGame(
  repository: SaveGameRepository,
  saveGameId: string,
): Promise<LoadedGame | null> {
  return repository.loadGame(saveGameId);
}

export async function listSaves(
  repository: SaveGameRepository,
): Promise<SaveGameSummary[]> {
  return repository.listSaves();
}
