import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { WorldGenerationConfig } from '@football-life/shared';
import { buildApp } from '../app';
import { createTestDatabase, type TestDatabase } from '../test/test-db';

// A small world keeps a whole simulated season fast.
const testWorldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
  clubsPerSecondDivision: 0,
  rosterSize: 14,
  age: { min: 16, max: 36, mean: 24, spread: 4 },
  ability: { topDivisionMean: 60, divisionStep: 12, spread: 9, min: 20, max: 95 },
  reputation: { topDivision: 3000, secondDivision: 1200, youth: 400 },
  namePools: {
    IT: {
      firstNames: ['Marco', 'Luca', 'Matteo', 'Andrea', 'Davide'],
      lastNames: ['Rossi', 'Bianchi', 'Esposito', 'Romano', 'Colombo'],
      cities: ['Milano', 'Torino', 'Roma', 'Napoli', 'Firenze'],
    },
  },
};

const newGamePayload = {
  name: 'Season Skip',
  player: {
    firstName: 'Skip',
    lastName: 'Tester',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('simulate to season end', () => {
  let db: TestDatabase;
  let app: FastifyInstance;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildApp({ prisma: db.prisma, worldConfig: testWorldConfig });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await db.cleanup();
  });

  // A full season is ~28 weeks of the complete weekly pipeline: it needs more
  // than vitest's 5s default, especially on a loaded machine.
  it('plays the whole season in one call and reports what the player did', { timeout: 60_000 }, async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/saves',
      payload: newGamePayload,
    });
    const saveId = created.json().save.id as string;
    const playerId = created.json().player.id as string;

    // Sign for a club and make the protagonist good enough to be picked.
    const clubs = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}/clubs` })
    ).json();
    await app.inject({
      method: 'POST',
      url: `/api/saves/${saveId}/sign`,
      payload: { clubId: clubs[0].clubId },
    });
    // Weekly training recomputes currentAbility from the visible attributes,
    // so raise those (not just the derived rating) to earn a starting spot.
    await db.prisma.playerAttribute.updateMany({
      where: { playerId, category: { not: 'HIDDEN' } },
      data: { value: 95 },
    });
    await db.prisma.player.update({
      where: { id: playerId },
      data: { currentAbility: 95, potentialAbility: 99, form: 85 },
    });

    const dateBefore = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}` })
    ).json().save.currentDate as string;

    const response = await app.inject({
      method: 'POST',
      url: `/api/saves/${saveId}/simulate-season`,
      payload: { intensity: 'NORMAL' },
    });
    expect(response.statusCode).toBe(200);
    const summary = response.json();

    // The season ran to its end, not a single week.
    expect(summary.seasonCompleted).toBe(true);
    expect(summary.weeksSimulated).toBeGreaterThan(4);
    expect(summary.newSeasonLabel).toBeTruthy();

    // Real matches were played and the protagonist actually featured.
    expect(summary.matchesPlayedByClub).toBeGreaterThan(0);
    expect(summary.won + summary.drawn + summary.lost).toBe(
      summary.matchesPlayedByClub,
    );
    expect(summary.appearances).toBeGreaterThan(0);
    expect(summary.goals).toBeGreaterThanOrEqual(0);
    expect(summary.assists).toBeGreaterThanOrEqual(0);
    expect(summary.averageRating).toBeGreaterThan(0);
    expect(summary.averageRating).toBeLessThanOrEqual(10);
    expect(Array.isArray(summary.titles)).toBe(true);
    expect(Array.isArray(summary.awards)).toBe(true);

    // Time really moved, and the appearances were persisted like a normal week.
    const dateAfter = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}` })
    ).json().save.currentDate as string;
    expect(new Date(dateAfter).getTime()).toBeGreaterThan(
      new Date(dateBefore).getTime(),
    );
    const persisted = await db.prisma.matchAppearance.count({
      where: { playerId },
    });
    expect(persisted).toBe(summary.appearances);

    // Season stats agree with the summary the player was shown.
    const stats = (
      await app.inject({
        method: 'GET',
        url: `/api/saves/${saveId}/season-stats`,
      })
    ).json();
    const totalGoals = stats.reduce(
      (sum: number, row: { goals: number }) => sum + row.goals,
      0,
    );
    expect(totalGoals).toBe(summary.goals);

    // No stale mid-season flash interview is left waiting.
    const dashboard = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}/dashboard` })
    ).json();
    expect(dashboard.postMatch).toBeNull();
  });

  it('404s for an unknown save', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/saves/does-not-exist/simulate-season',
      payload: {},
    });
    expect(response.statusCode).toBe(404);
  });

  it('refuses to burn weeks when the player has no club', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/saves',
      payload: { ...newGamePayload, name: 'Unsigned' },
    });
    const saveId = created.json().save.id as string;
    const before = created.json().save.currentDate as string;

    const response = await app.inject({
      method: 'POST',
      url: `/api/saves/${saveId}/simulate-season`,
      payload: {},
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('NoClub');

    // Nothing moved: the career is exactly where it was.
    const after = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}` })
    ).json().save.currentDate as string;
    expect(after).toBe(before);
  });
});
