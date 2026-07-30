import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { WorldGenerationConfig } from '@football-life/shared';
import { buildApp } from '../app';
import { STARTING_BALANCE } from '../config';
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

// A tiny world keeps the many create-save calls in this suite fast.
const testWorldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
  clubsPerSecondDivision: 0,
  rosterSize: 14,
  age: { min: 16, max: 36, mean: 24, spread: 4 },
  ability: {
    topDivisionMean: 60,
    divisionStep: 12,
    spread: 9,
    min: 20,
    max: 95,
  },
  reputation: { topDivision: 3000, secondDivision: 1200, youth: 400 },
  namePools: {
    IT: {
      firstNames: ['Marco', 'Luca', 'Matteo', 'Andrea', 'Davide'],
      lastNames: ['Rossi', 'Bianchi', 'Esposito', 'Romano', 'Colombo'],
      cities: ['Milano', 'Torino', 'Roma', 'Napoli', 'Firenze'],
    },
  },
};

describe('HTTP API', () => {
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
    expect(body.player.ageYears).toBe(18);
    expect(body.save.id).toBeTruthy();
  });

  it('lists the quick-start modes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/quick-starts',
    });
    expect(response.statusCode).toBe(200);
    const modes = response.json();
    expect(modes.map((m: { key: string }) => m.key)).toEqual([
      'CLASSIC',
      'WONDERKID',
      'STARTER',
      'VETERAN',
    ]);
  });

  it('a quick-start career signs with a club automatically', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/saves',
      payload: { ...newGamePayload, quickStart: 'STARTER' },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.player.ageYears).toBe(21);
    expect(body.player.potentialAbility).toBe(78);
    expect(body.player.clubId).toBeTruthy();
    expect(body.player.clubName).toBeTruthy();
    expect(body.player.currentAbility).toBeCloseTo(62, 0);
  });

  it('edits club and competition names and logos in the world editor', async () => {
    const saveId = await createSave();
    const world = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}/world` })
    ).json();
    expect(world.clubs.length).toBeGreaterThan(0);
    expect(world.competitions.length).toBeGreaterThan(0);

    // Rename a club to Inter and give it a crest.
    const club = world.clubs[0];
    const logo = 'data:image/png;base64,iVBORw0KGgo=';
    const clubEdit = await app.inject({
      method: 'POST',
      url: `/api/saves/${saveId}/world/club/${club.clubId}`,
      payload: { name: 'Milano Nerazzurra', shortName: 'int', logo },
    });
    expect(clubEdit.statusCode).toBe(200);

    // Rename its league too.
    const league = world.competitions.find(
      (c: { type: string }) => c.type === 'LEAGUE',
    );
    const compEdit = await app.inject({
      method: 'POST',
      url: `/api/saves/${saveId}/world/competition/${league.competitionId}`,
      payload: { name: 'Prima Divisione', logo },
    });
    expect(compEdit.statusCode).toBe(200);

    const after = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}/world` })
    ).json();
    const editedClub = after.clubs.find(
      (c: { clubId: string }) => c.clubId === club.clubId,
    );
    expect(editedClub.name).toBe('Milano Nerazzurra');
    expect(editedClub.shortName).toBe('INT');
    expect(editedClub.logo).toBe(logo);
    expect(
      after.competitions.find(
        (c: { competitionId: string }) =>
          c.competitionId === league.competitionId,
      ).name,
    ).toBe('Prima Divisione');

    // The new name flows into the club directory used by the rest of the app.
    const clubs = (
      await app.inject({ method: 'GET', url: `/api/saves/${saveId}/clubs` })
    ).json();
    const inDirectory = clubs.find(
      (c: { clubId: string }) => c.clubId === club.clubId,
    );
    expect(inDirectory.name).toBe('Milano Nerazzurra');
    expect(inDirectory.logo).toBe(logo);

    // Guard rails: empty edit and foreign ids are rejected.
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/saves/${saveId}/world/club/${club.clubId}`,
          payload: {},
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/saves/${saveId}/world/club/not-a-club`,
          payload: { name: 'X' },
        })
      ).statusCode,
    ).toBe(404);
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
    expect(initial.json().balance).toBe(STARTING_BALANCE);

    const grant = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/finance`,
      payload: { amount: 1_000_000, description: 'Editor grant' },
    });
    expect(grant.statusCode).toBe(200);
    expect(grant.json().balance).toBe(STARTING_BALANCE + 1_000_000);

    const deduct = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/finance`,
      payload: { amount: -250_000 },
    });
    expect(deduct.json().balance).toBe(STARTING_BALANCE + 750_000);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/saves/nope/finance',
    });
    expect(missing.statusCode).toBe(404);
  });

  it('deletes a save and 404s on a missing one', async () => {
    const id = await createSave();

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/saves/${id}`,
    });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().deleted).toBe(true);

    const reload = await app.inject({ method: 'GET', url: `/api/saves/${id}` });
    expect(reload.statusCode).toBe(404);

    const again = await app.inject({
      method: 'DELETE',
      url: `/api/saves/${id}`,
    });
    expect(again.statusCode).toBe(404);
  });

  it('lists clubs and signs a starting contract crediting the bonus', async () => {
    const id = await createSave();

    const clubsRes = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/clubs`,
    });
    expect(clubsRes.statusCode).toBe(200);
    const clubs = clubsRes.json() as { clubId: string; name: string }[];
    expect(clubs.length).toBe(4);
    expect(clubs[0]?.name).toBeTruthy();

    const before = (
      await app.inject({ method: 'GET', url: `/api/saves/${id}/finance` })
    ).json().balance as number;

    const sign = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/sign`,
      payload: { clubId: clubs[0]?.clubId },
    });
    expect(sign.statusCode).toBe(200);
    const signed = sign.json();
    expect(signed.clubId).toBe(clubs[0]?.clubId);
    expect(signed.weeklyWage).toBeGreaterThan(0);
    expect(signed.balance).toBe(before + signed.signingBonus);

    // The protagonist now has a club on the dashboard.
    const dash = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/dashboard`,
    });
    expect(dash.json().player.clubId).toBe(clubs[0]?.clubId);

    const missing = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/sign`,
      payload: { clubId: 'nope' },
    });
    expect(missing.statusCode).toBe(404);
  });

  it('lists shop items and buys one, charging the wallet', async () => {
    const id = await createSave();

    const shopRes = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/shop`,
    });
    expect(shopRes.statusCode).toBe(200);
    const items = shopRes.json() as { key: string; price: number }[];
    expect(items.length).toBeGreaterThan(0);

    const before = (
      await app.inject({ method: 'GET', url: `/api/saves/${id}/finance` })
    ).json().balance as number;

    const buy = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/shop/buy`,
      payload: { itemKey: 'training-watch' },
    });
    expect(buy.statusCode).toBe(200);
    expect(buy.json().balance).toBe(before - 2_500);

    // Too-expensive item is rejected with 409 and the balance is unchanged.
    const tooMuch = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/shop/buy`,
      payload: { itemKey: 'sports-car' },
    });
    expect(tooMuch.statusCode).toBe(409);
    expect(tooMuch.json().error).toBe('InsufficientFunds');

    const unknown = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/shop/buy`,
      payload: { itemKey: 'nope' },
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('chooses an agent, negotiates a wage and secures a sponsor', async () => {
    const id = await createSave();

    // Requests without an agent are refused.
    const noAgent = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/agent/request`,
      payload: { type: 'sponsor' },
    });
    expect(noAgent.statusCode).toBe(409);
    expect(noAgent.json().error).toBe('NoAgent');

    // Sign a club so there is a contract to renegotiate.
    const clubs = (
      await app.inject({ method: 'GET', url: `/api/saves/${id}/clubs` })
    ).json() as { clubId: string }[];
    await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/sign`,
      payload: { clubId: clubs[0]?.clubId },
    });

    const choose = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/agent`,
      payload: { agentKey: 'shark' },
    });
    expect(choose.statusCode).toBe(200);
    expect(choose.json().agentKey).toBe('shark');

    const wage = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/agent/negotiate-wage`,
    });
    expect(wage.statusCode).toBe(200);
    expect(typeof wage.json().message).toBe('string');

    const before = (
      await app.inject({ method: 'GET', url: `/api/saves/${id}/finance` })
    ).json().balance as number;
    const sponsor = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/agent/request`,
      payload: { type: 'sponsor' },
    });
    expect(sponsor.statusCode).toBe(200);
    expect(sponsor.json().balance).toBeGreaterThan(before);

    // The agent can drum up transfer offers, which can then be accepted.
    const listOffers = async () =>
      (
        await app.inject({ method: 'GET', url: `/api/saves/${id}/offers` })
      ).json() as { id: string; clubName: string }[];
    const requestTransfer = () =>
      app.inject({
        method: 'POST',
        url: `/api/saves/${id}/agent/request`,
        payload: { type: 'transfer' },
      });

    await requestTransfer();
    const firstCount = (await listOffers()).length;
    // A second search must replace, not pile onto, the pending offers.
    await requestTransfer();
    const offers = await listOffers();
    expect(offers.length).toBe(firstCount);
    // At most one offer per club (deduped).
    const clubNames = offers.map((o) => o.clubName);
    expect(new Set(clubNames).size).toBe(clubNames.length);
    if (offers.length > 0) {
      expect(offers[0]?.clubName).toBeTruthy();
      const accept = await app.inject({
        method: 'POST',
        url: `/api/saves/${id}/offers/${offers[0]?.id}/respond`,
        payload: { accept: false },
      });
      expect(accept.statusCode).toBe(200);
      expect(accept.json()).toHaveProperty('accepted');
    }
  });

  it('lists and sets the lifestyle', async () => {
    const id = await createSave();

    const list = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/lifestyles`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().current).toBeNull();
    expect(list.json().lifestyles.length).toBeGreaterThan(0);

    const set = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/lifestyle`,
      payload: { lifestyle: 'PLAYBOY' },
    });
    expect(set.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/lifestyles`,
    });
    expect(after.json().current).toBe('PLAYBOY');

    const bad = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/lifestyle`,
      payload: { lifestyle: 'NOPE' },
    });
    expect(bad.statusCode).toBe(404);
  });

  it('stores and clears a profile image, empty by default', async () => {
    const id = await createSave();

    const initial = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/avatar`,
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json().avatarDataUrl).toBeNull();

    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const set = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/avatar`,
      payload: { dataUrl },
    });
    expect(set.statusCode).toBe(200);
    expect(
      (
        await app.inject({ method: 'GET', url: `/api/saves/${id}/avatar` })
      ).json().avatarDataUrl,
    ).toBe(dataUrl);

    const cleared = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/avatar`,
      payload: { dataUrl: null },
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().avatarDataUrl).toBeNull();

    // A non-image string is rejected.
    const bad = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/avatar`,
      payload: { dataUrl: 'not-an-image' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('runs a press interview once per week', async () => {
    const id = await createSave();

    const session = await app.inject({
      method: 'GET',
      url: `/api/saves/${id}/interview`,
    });
    expect(session.statusCode).toBe(200);
    const data = session.json() as {
      available: boolean;
      questions: { key: string; answers: { key: string }[] }[];
    };
    expect(data.available).toBe(true);
    expect(data.questions.length).toBe(3);

    const answers = data.questions.map((q) => ({
      questionKey: q.key,
      answerKey: q.answers[0]?.key,
    }));
    const submit = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/interview`,
      payload: { answers },
    });
    expect(submit.statusCode).toBe(200);
    expect(submit.json().stats).toBeTruthy();

    // Only one interview per week.
    const again = await app.inject({
      method: 'POST',
      url: `/api/saves/${id}/interview`,
      payload: { answers },
    });
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toBe('AlreadyInterviewed');
  });
});
