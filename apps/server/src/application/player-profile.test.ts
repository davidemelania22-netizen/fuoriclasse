import { describe, expect, it } from 'vitest';
import { getPlayerProfile } from './player-profile';
import type {
  PlayerProfileData,
  PlayerProfileRepository,
} from '../repositories/player-profile-repository';
import type { ProfileRepository } from '../repositories/profile-repository';

function attributes(overrides: Record<string, number> = {}) {
  const technical = [
    'ballControl',
    'shortPassing',
    'longPassing',
    'finishing',
    'longShots',
    'dribbling',
    'crossing',
    'heading',
    'marking',
    'tackling',
    'technique',
    'setPieces',
    'penalties',
    'firstTouch',
  ];
  const physical = [
    'acceleration',
    'pace',
    'strength',
    'stamina',
    'agility',
    'balance',
    'jumping',
    'coordination',
    'physicalRecovery',
    'injuryResistance',
  ];
  const mental = [
    'concentration',
    'decisions',
    'vision',
    'anticipation',
    'composure',
    'determination',
    'discipline',
    'leadership',
    'bravery',
    'creativity',
    'professionalism',
    'ambition',
    'pressureHandling',
    'adaptability',
  ];
  const rows = [
    ...technical.map((key) => ({ key, category: 'TECHNICAL', value: 50 })),
    ...physical.map((key) => ({ key, category: 'PHYSICAL', value: 50 })),
    ...mental.map((key) => ({ key, category: 'MENTAL', value: 50 })),
    { key: 'loyalty', category: 'HIDDEN', value: 50 },
  ];
  return rows.map((row) =>
    overrides[row.key] === undefined
      ? row
      : { ...row, value: overrides[row.key]! },
  );
}

function data(overrides: Partial<PlayerProfileData> = {}): PlayerProfileData {
  return {
    playerId: 'player-1',
    firstName: 'Davide',
    lastName: 'Simonetti',
    birthDate: '2007-05-11T00:00:00.000Z',
    ageYears: 20,
    nationalityId: 'IT',
    primaryPosition: 'FW',
    secondaryPositions: [],
    preferredFoot: 'RIGHT',
    heightCm: 190,
    weightKg: 82.4,
    currentAbility: 100,
    potentialAbility: 100,
    reputation: 8000,
    popularity: 5000,
    marketValue: 79_000_000,
    condition: 90,
    fatigue: 10,
    morale: 80,
    form: 70,
    stress: 20,
    careerStatus: 'ACTIVE',
    attributes: attributes(),
    contract: {
      clubId: 'club-1',
      clubName: 'Milano Nerazzurra',
      clubLogo: null,
      weeklyWage: 26_346,
      endDate: '2029-06-30T00:00:00.000Z',
      squadRole: 'KEY',
    },
    seasonLabel: '2027/28',
    seasonLines: [
      {
        competitionName: 'Italia Serie A',
        appearances: 10,
        goals: 16,
        assists: 3,
        yellowCards: 1,
        redCards: 0,
        averageRating: 7.5,
      },
    ],
    recentMatches: [],
    careerTotals: { appearances: 70, goals: 167, assists: 40, clubs: 3 },
    ...overrides,
  };
}

function deps(record: PlayerProfileData | null) {
  const profileData: PlayerProfileRepository = {
    loadPlayerProfile: async () => record,
  };
  const profile = {
    getProfile: async () => ({ avatarDataUrl: null }),
  } as unknown as ProfileRepository;
  return { profileData, profile };
}

describe('player profile', () => {
  it('returns null when the save has no protagonist', async () => {
    expect(await getPlayerProfile(deps(null), 'save-1')).toBeNull();
  });

  it('turns ability into half stars and reputation into a word', async () => {
    const view = (await getPlayerProfile(deps(data()), 'save-1'))!;
    expect(view.abilityStars).toBe(5);
    expect(view.potentialStars).toBe(5);
    expect(view.reputationLabel).toBe('Mondiale');

    const modest = (await getPlayerProfile(
      deps(data({ currentAbility: 45, reputation: 100 })),
      'save-1',
    ))!;
    expect(modest.abilityStars).toBe(2.5);
    expect(modest.reputationLabel).toBe('Sconosciuta');
  });

  it('shows attributes on the 0-20 scale and hides the hidden ones', async () => {
    const view = (await getPlayerProfile(
      deps(data({ attributes: attributes({ finishing: 100 }) })),
      'save-1',
    ))!;
    expect(view.attributes.some((a) => a.category === 'HIDDEN')).toBe(false);
    expect(view.attributes.find((a) => a.key === 'finishing')?.value).toBe(20);
    expect(view.attributes.find((a) => a.key === 'ballControl')?.value).toBe(
      10,
    );
  });

  it('marks the attributes that decide the position', async () => {
    const striker = (await getPlayerProfile(deps(data()), 'save-1'))!;
    const keyed = new Set(
      striker.attributes.filter((a) => a.isKey).map((a) => a.key),
    );
    expect(keyed.has('finishing')).toBe(true);
    expect(keyed.has('marking')).toBe(false);

    const defender = (await getPlayerProfile(
      deps(data({ primaryPosition: 'DF' })),
      'save-1',
    ))!;
    const defenderKeys = new Set(
      defender.attributes.filter((a) => a.isKey).map((a) => a.key),
    );
    expect(defenderKeys.has('marking')).toBe(true);
    expect(defenderKeys.has('finishing')).toBe(false);
  });

  it('reads a personality off the mental attributes', async () => {
    const model = (await getPlayerProfile(
      deps(
        data({
          attributes: attributes({
            professionalism: 90,
            determination: 90,
            discipline: 90,
          }),
        }),
      ),
      'save-1',
    ))!;
    expect(model.personalityLabel).toBe('Cittadino modello');

    // An unremarkable player is balanced, never insulted by default.
    const ordinary = (await getPlayerProfile(deps(data()), 'save-1'))!;
    expect(ordinary.personalityLabel).toBe('Equilibrato');

    const sloppy = (await getPlayerProfile(
      deps(
        data({
          attributes: attributes({ concentration: 20, professionalism: 20 }),
        }),
      ),
      'save-1',
    ))!;
    expect(sloppy.personalityLabel).toBe('Incostante');
  });

  it('scores an outfielder poorly as an emergency keeper', async () => {
    const striker = (await getPlayerProfile(deps(data()), 'save-1'))!;
    const keeper = (await getPlayerProfile(
      deps(data({ primaryPosition: 'GK' })),
      'save-1',
    ))!;
    expect(striker.keeperRating).toBeLessThan(keeper.keeperRating);
    expect(keeper.keeperRating).toBe(5);
  });

  it('keeps the squad role, the contract and the season in words', async () => {
    const view = (await getPlayerProfile(deps(data()), 'save-1'))!;
    expect(view.squadRoleLabel).toBe('Stella');
    expect(view.positionLabel).toBe('Punta (Centrale)');
    expect(view.footLabel).toBe('Destro');
    expect(view.footStrength).toEqual({ left: 2, right: 5 });
    expect(view.weeklyWage).toBe(26_346);
    expect(view.seasonLines[0]?.goals).toBe(16);
    expect(view.careerTotals.goals).toBe(167);
  });

  it('survives a player with no club and no season yet', async () => {
    const view = (await getPlayerProfile(
      deps(data({ contract: null, seasonLabel: null, seasonLines: [] })),
      'save-1',
    ))!;
    expect(view.clubName).toBeNull();
    expect(view.squadRoleLabel).toBeNull();
    expect(view.weeklyWage).toBeNull();
    expect(view.seasonLines).toEqual([]);
  });
});
