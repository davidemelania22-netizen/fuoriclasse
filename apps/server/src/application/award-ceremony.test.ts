import { describe, expect, it } from 'vitest';
import type {
  CareerTimelineData,
  CareerTimelineRepository,
} from '../repositories/career-timeline-repository';
import type { EditorRepository } from '../repositories/editor-repository';
import type { PlayerProfile } from '../repositories/profile-repository';
import { getAwardCeremony, markCeremonySeen } from './award-ceremony';

const PLAYER = 'player-1';
const OUR_CLUB = 'club-ours';
const OTHER_CLUB = 'club-theirs';

function honour(over: Partial<CareerTimelineData['honours'][number]> = {}) {
  return {
    id: 'h1',
    type: 'LEAGUE_TITLE',
    clubId: OUR_CLUB,
    clubName: 'Milano Rossonera',
    playerId: null,
    seasonLabel: '2025/2026',
    competitionName: 'Italia Prima Divisione',
    createdAt: '2026-05-20T00:00:00.000Z',
    ...over,
  };
}

function deps(
  honours: CareerTimelineData['honours'],
  profile: Partial<PlayerProfile> = {},
) {
  const stored: Partial<PlayerProfile> = {
    avatarDataUrl: null,
    celebratedHonourIds: [],
    ...profile,
  };
  const timeline: CareerTimelineRepository = {
    loadCareerTimelineData: async () => ({
      playerId: PLAYER,
      nationalityId: 'IT',
      contracts: [
        {
          clubId: OUR_CLUB,
          clubName: 'Milano Rossonera',
          startDate: '2025-07-01T00:00:00.000Z',
        },
      ],
      appearances: [],
      honours,
    }),
  };
  const editor = {
    loadEditablePlayer: async () => ({
      firstName: 'Luca',
      lastName: 'Ferrari',
    }),
  } as unknown as EditorRepository;
  const profileRepo = {
    getProfile: async () => stored as PlayerProfile,
    setCelebratedHonours: async (_id: string, ids: string[]) => {
      stored.celebratedHonourIds = ids;
      return true;
    },
  } as unknown as Parameters<typeof getAwardCeremony>[0]['profile'];
  return { timeline, editor, profile: profileRepo, stored };
}

describe('getAwardCeremony', () => {
  it('celebrates a trophy won while at the club', async () => {
    const d = deps([honour()]);
    const ceremony = await getAwardCeremony(d, 'save-1');
    expect(ceremony?.label).toBe('Titolo di Lega');
    expect(ceremony?.clubName).toBe('Milano Rossonera');
    // Team trophies take the club's colours; the shirt is red and black.
    expect(ceremony?.colors.primary).toBe('#c8102e');
    expect(ceremony?.careerTotal).toBe(1);
  });

  it('ignores a trophy the club won before the player arrived', async () => {
    const early = honour({ createdAt: '2024-05-20T00:00:00.000Z' });
    expect(await getAwardCeremony(deps([early]), 'save-1')).toBeNull();
  });

  it('ignores a trophy won by another club', async () => {
    const theirs = honour({ clubId: OTHER_CLUB, clubName: 'Torino Granata' });
    expect(await getAwardCeremony(deps([theirs]), 'save-1')).toBeNull();
  });

  it('celebrates an individual award only when it names the player', async () => {
    const mine = honour({
      id: 'h2',
      type: 'BALLON_DOR',
      clubId: null,
      clubName: null,
      playerId: PLAYER,
    });
    const theirs = honour({
      id: 'h3',
      type: 'BALLON_DOR',
      clubId: null,
      clubName: null,
      playerId: 'someone-else',
    });
    expect((await getAwardCeremony(deps([mine]), 'save-1'))?.isPersonal).toBe(
      true,
    );
    expect(await getAwardCeremony(deps([theirs]), 'save-1')).toBeNull();
  });

  it('hands out an individual award in gold, not in club colours', async () => {
    const mine = honour({
      type: 'GOLDEN_BOOT',
      clubId: null,
      clubName: null,
      playerId: PLAYER,
    });
    const ceremony = await getAwardCeremony(deps([mine]), 'save-1');
    expect(ceremony?.colors.primary).toBe('#d4af37');
  });

  it('queues a season of trophies oldest first, one per dismissal', async () => {
    const first = honour({ id: 'a', createdAt: '2026-05-01T00:00:00.000Z' });
    const second = honour({
      id: 'b',
      type: 'NATIONAL_CUP',
      createdAt: '2026-05-30T00:00:00.000Z',
    });
    const d = deps([second, first]);

    const one = await getAwardCeremony(d, 'save-1');
    expect(one?.honourId).toBe('a');
    expect(one?.careerTotal).toBe(1);

    await markCeremonySeen(d, 'save-1', 'a');
    const two = await getAwardCeremony(d, 'save-1');
    expect(two?.honourId).toBe('b');
    expect(two?.careerTotal).toBe(2);

    await markCeremonySeen(d, 'save-1', 'b');
    expect(await getAwardCeremony(d, 'save-1')).toBeNull();
  });

  it('never replays a trophy already celebrated', async () => {
    const d = deps([honour({ id: 'seen' })], { celebratedHonourIds: ['seen'] });
    expect(await getAwardCeremony(d, 'save-1')).toBeNull();
  });
});
