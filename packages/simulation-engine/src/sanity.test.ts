import { describe, expect, it } from 'vitest';
import { SIMULATION_ENGINE_VERSION } from './index';

describe('simulation-engine', () => {
  it('exposes a version string', () => {
    expect(SIMULATION_ENGINE_VERSION).toBe('0.1.0');
  });
});
