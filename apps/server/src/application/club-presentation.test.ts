import { describe, expect, it } from 'vitest';
import {
  getClubPresentation,
  markPresentationSeen,
  type ClubPresentationDeps,
} from './club-presentation';
import type {
  PlayerProfile,
  StoredPendingRenewal,
} from '../repositories/profile-repository';

const CLUB = 'club-1';
const NOW = new Date('2026-03-01T00:00:00.000Z');

function harness(profileOver: Partial<PlayerProfile> = {}) {
  let profile = {
    lastPresentedClubId: null,
    pendingRenewal: null,
    avatarDataUrl: null,
    ...profileOver,
  } as PlayerProfile;

  const deps = {
    career: {
      loadProtagonist: async () => ({
        playerId: 'player-1',
        clubId: CLUB,
        currentDate: NOW,
        currentContract: {
          id: 'contract-1',
          clubId: CLUB,
          endDate: new Date('2029-03-01T00:00:00.000Z'),
          squadRole: 'FIRST_TEAM',
          weeklyWage: 4_000,
          appearanceBonus: 400,
          goalBonus: 2_000,
        },
      }),
      listClubDirectory: async () => [
        {
          clubId: CLUB,
          name: 'Milano Rossonera',
          logo: null,
          competitionName: 'Italia Prima Divisione',
        },
      ],
    },
    profile: {
      getProfile: async () => profile,
      setLastPresentedClub: async (_id: string, clubId: string) => {
        profile = { ...profile, lastPresentedClubId: clubId };
        return true;
      },
      setPendingRenewal: async (
        _id: string,
        renewal: StoredPendingRenewal | null,
      ) => {
        profile = { ...profile, pendingRenewal: renewal };
        return true;
      },
    },
    editor: {
      loadEditablePlayer: async () => ({
        firstName: 'Marco',
        lastName: 'Rossi',
      }),
    },
    saveGame: {
      loadGame: async () => ({ player: { primaryPosition: 'FW' } }),
    },
  } as unknown as ClubPresentationDeps;

  return {
    deps,
    get profile() {
      return profile;
    },
  };
}

const renewal: StoredPendingRenewal = {
  clubId: CLUB,
  years: 3,
  weeklyWage: 4_000,
  squadRole: 'FIRST_TEAM',
  signedAt: NOW.toISOString(),
};

describe('club presentation', () => {
  it('unveils a player at a club he has just joined', async () => {
    const h = harness();
    const scene = (await getClubPresentation(h.deps, 'save-1'))!;
    expect(scene.kind).toBe('SIGNING');
    expect(scene.clubName).toBe('Milano Rossonera');
  });

  it('shows nothing once the unveiling has been watched', async () => {
    const h = harness({ lastPresentedClubId: CLUB });
    expect(await getClubPresentation(h.deps, 'save-1')).toBeNull();
  });

  it('does not re-unveil a player who merely renewed', async () => {
    // The bug this guards: staying is not arriving, and the scene must never
    // call a man who has been here for years "un nuovo giocatore".
    const h = harness({ lastPresentedClubId: CLUB, pendingRenewal: renewal });
    const scene = (await getClubPresentation(h.deps, 'save-1'))!;
    expect(scene.kind).toBe('RENEWAL');
  });

  it('prefers the unveiling when a move and a renewal both wait', async () => {
    const h = harness({ lastPresentedClubId: 'other-club', pendingRenewal: renewal });
    expect((await getClubPresentation(h.deps, 'save-1'))?.kind).toBe('SIGNING');
  });

  it('ignores a renewal signed with a club he has since left', async () => {
    const h = harness({
      lastPresentedClubId: CLUB,
      pendingRenewal: { ...renewal, clubId: 'old-club' },
    });
    expect(await getClubPresentation(h.deps, 'save-1')).toBeNull();
  });

  it('plays the renewal scene once and then never again', async () => {
    const h = harness({ lastPresentedClubId: CLUB, pendingRenewal: renewal });
    expect(await getClubPresentation(h.deps, 'save-1')).not.toBeNull();
    await markPresentationSeen(h.deps, 'save-1');
    expect(h.profile.pendingRenewal).toBeNull();
    expect(await getClubPresentation(h.deps, 'save-1')).toBeNull();
  });

  it('carries the agreed terms into the scene', async () => {
    const h = harness({ lastPresentedClubId: CLUB, pendingRenewal: renewal });
    const scene = (await getClubPresentation(h.deps, 'save-1'))!;
    expect(scene.weeklyWage).toBe(4_000);
    expect(scene.contractYears).toBe(3);
  });
});
