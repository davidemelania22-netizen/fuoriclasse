import { describe, expect, it } from 'vitest';
import { matchConfigSchema } from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from './match-config';

describe('DEFAULT_MATCH_CONFIG', () => {
  it('passes Zod schema validation', () => {
    expect(() => matchConfigSchema.parse(DEFAULT_MATCH_CONFIG)).not.toThrow();
  });

  it('uses an eleven-player formation', () => {
    const f = DEFAULT_MATCH_CONFIG.formation;
    expect(f.GK + f.DF + f.MF + f.WG + f.FW).toBe(11);
  });
});
