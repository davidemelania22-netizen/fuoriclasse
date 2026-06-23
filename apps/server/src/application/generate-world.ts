import type {
  CountryRecord,
  WorldGenerationConfig,
} from '@football-life/shared';
import { generateWorld } from '@football-life/simulation-engine';
import type {
  WorldPersistenceSummary,
  WorldRepository,
} from '../repositories/world-repository';

export interface GenerateWorldDeps {
  worldRepository: WorldRepository;
}

export interface GenerateWorldInput {
  saveGameId: string;
  seed: string;
  countries: readonly CountryRecord[];
  config: WorldGenerationConfig;
}

/**
 * Deterministically generate a world for the given seed and persist it under
 * the save game. Generation (engine) and persistence (repository) stay separate.
 */
export async function generateAndPersistWorld(
  deps: GenerateWorldDeps,
  input: GenerateWorldInput,
): Promise<WorldPersistenceSummary> {
  const world = generateWorld({
    seed: input.seed,
    countries: input.countries,
    config: input.config,
  });
  return deps.worldRepository.persistWorld(input.saveGameId, world);
}
