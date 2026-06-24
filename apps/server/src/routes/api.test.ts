import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { createTestDatabase, type TestDatabase } from '../test/test-db';

const newGamePayload = {
  name: 'API Career',
  player: {
    firstName: 'Api',
    lastName: 'Tester',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('HTTP API', () => {
  let db: TestDatabase;
  let app: FastifyInstance;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = buildApp({ prisma: db.prisma });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await db.cleanup();
  });

  async function createSave(): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/saves',
      payload: newGamePayload,
    });
    expect(response.statusCode).toBe(201);
    return response.json().save.id as string;
  }

  it('creates a new career', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/saves',
      payload: newGamePayload,
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.player.ageYears).toBe(14);
    expect(body.save.id).toBeTruthy();
  });

  it('rejects an invalid new-career payload with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/saves',
      payload: { name: '', player: {} },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('ValidationError');
  });

  it('lists saves and 404s on an unknown save', async () => {
    await createSave();
    const list = await app.inject({ method: 'GET', url: '/api/saves' });
    expect(list.statusCode).toBe(200);
    expect(Array.isArray(list.json())).toBe(true);
    expect(list.json().length).toBeGreaterThanOrEqual(1);

    const missing = await app.inject({ method: 'GET', url: '/api/saves/nope' });
    expect(missing.statusCode).toBe(404);
  });

  it('returns a dashboard', async () => {
    const id = await createSave();
    const response = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/dashboard`,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.player).toBeDefined();
    expect(Array.isArray(body.pendingEvents)).toBe(true);
  });

  it('advances a week and surfaces an event to resolve', async () => {
    const id = await createSave();

    const bad = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/advance-week`,
      payload: { intensity: 'SUPER' },
    });
    expect(bad.statusCode).toBe(400);

    const advance = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/advance-week`,
      payload: { weeks: 2, intensity: 'NORMAL' },
    });
    expect(advance.statusCode).toBe(200);
    expect(advance.json().report.weeksAdvanced).toBe(2);

    const event = advance.json().event;
    if (event) {
      const choose = await app.inject({
        method: 'POST',
        url: `/api/saves/${id}/events/${event.gameEventId}/choose`,
        payload: { choiceKey: event.choices[0].key },
      });
      expect(choose.statusCode).toBe(200);

      const chooseAgain = await app.inject({
        method: 'POST',
        url: `/api/saves/${id}/events/${event.gameEventId}/choose`,
        payload: { choiceKey: event.choices[0].key },
      });
      expect(chooseAgain.statusCode).toBe(409);
    }
  });

  it('advancing an unknown save returns 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/saves/nope/advance-week',
      payload: { weeks: 1 },
    });
    expect(response.statusCode).toBe(404);
  });

  it('loads and edits the protagonist via the editor, clamping out-of-range values', async () => {
    const id = await createSave();

    const editable = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/editable-player`,
    });
    expect(editable.statusCode).toBe(200);
    expect(editable.json().attributes.length).toBeGreaterThanOrEqual(49);

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/saves/${id}/player`,
      payload: {
        currentAbility: 88,
        morale: 95,
        careerStatus: 'ACTIVE',
        attributes: [{ key: 'finishing', value: 150 }],
      },
    });
    expect(patch.statusCode).toBe(200);
    const body = patch.json();
    expect(body.currentAbility).toBe(88);
    expect(body.morale).toBe(95);
    const finishing = body.attributes.find(
      (a: { key: string; value: number }) => a.key === 'finishing',
    );
    expect(finishing.value).toBe(99); // clamped from 150

    // Persisted: the dashboard reflects the edit.
    const dashboard = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/dashboard`,
    });
    expect(dashboard.json().player.currentAbility).toBe(88);
  });

  it('editing an unknown save returns 404', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/saves/nope/player',
      payload: { morale: 50 },
    });
    expect(response.statusCode).toBe(404);
  });

  it('reads and adjusts the balance (external editor / money)', async () => {
    const id = await createSave();

    const initial = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/finance`,
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json().balance).toBe(0);

    const grant = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/finance`,
      payload: { amount: 1_000_000, description: 'Editor grant' },
    });
    expect(grant.statusCode).toBe(200);
    expect(grant.json().balance).toBe(1_000_000);

    const deduct = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/finance`,
      payload: { amount: -250_000 },
    });
    expect(deduct.json().balance).toBe(750_000);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/saves/nope/finance',
    });
    expect(missing.statusCode).toBe(404);
  });
});
