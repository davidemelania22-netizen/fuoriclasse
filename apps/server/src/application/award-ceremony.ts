import { clubColors } from '@football-life/game-data';
import type {
  CareerTimelineData,
  CareerTimelineRepository,
} from '../repositories/career-timeline-repository';
import type { EditorRepository } from '../repositories/editor-repository';
import type { ProfileRepository } from '../repositories/profile-repository';

/**
 * The night a trophy is lifted.
 *
 * Derived the same way the unveiling is: the honours the protagonist can
 * claim are recomputed, the ones already celebrated are subtracted, and
 * whatever is left oldest-first is owed a ceremony. Nothing has to call in
 * when a trophy is won, and a career that collected silverware before this
 * feature existed gets its ceremonies on the next visit.
 */

/** Trophies the protagonist can be handed. Keys match the honour types. */
const CEREMONY_LABELS: Record<string, string> = {
  BALLON_DOR: "Sfera d'Oro",
  GOLDEN_BOOT: 'Scarpa Dorata',
  LEAGUE_TITLE: 'Titolo di Lega',
  NATIONAL_CUP: 'Coppa Nazionale',
  CONTINENTAL_CUP: 'Coppa Continentale',
  INTERNATIONAL: 'Torneo delle Nazioni',
};

/** Individual awards are handed to a person; the rest are lifted by a team. */
const PERSONAL = new Set(['BALLON_DOR', 'GOLDEN_BOOT']);

/** Gold, for a trophy that belongs to nobody's colours. */
const GOLD = { primary: '#d4af37', secondary: '#8a6a12', onDark: '#f0cf67' };

export interface AwardCeremony {
  honourId: string;
  type: string;
  /** What the trophy is called, in words. */
  label: string;
  /** True for individual awards: changes the scene's wording. */
  isPersonal: boolean;
  competitionName: string | null;
  seasonLabel: string;
  clubName: string | null;
  colors: { primary: string; secondary: string; onDark: string };
  playerName: string;
  avatarDataUrl: string | null;
  /** How many trophies the protagonist has lifted, this one included. */
  careerTotal: number;
}

export interface AwardCeremonyDeps {
  timeline: CareerTimelineRepository;
  profile: ProfileRepository;
  editor: EditorRepository;
}

/**
 * Honours the protagonist may claim: individual awards naming them, and team
 * trophies won while actually under contract at that club — or wearing that
 * national shirt. The same rule the career timeline applies, so the two can
 * never disagree about what the player has won.
 */
function claimableHonours(data: CareerTimelineData) {
  return data.honours.filter((honour) => {
    if (!CEREMONY_LABELS[honour.type]) return false;
    if (PERSONAL.has(honour.type)) return honour.playerId === data.playerId;
    if (!honour.clubId) return false;
    if (honour.type === 'INTERNATIONAL') {
      return honour.clubId === data.nationalityId;
    }
    const wonAt = new Date(honour.createdAt).getTime();
    return data.contracts.some((contract, i) => {
      if (contract.clubId !== honour.clubId) return false;
      const start = new Date(contract.startDate).getTime();
      const next = data.contracts[i + 1];
      const end = next ? new Date(next.startDate).getTime() : Infinity;
      return wonAt >= start && wonAt < end;
    });
  });
}

export async function getAwardCeremony(
  deps: AwardCeremonyDeps,
  saveGameId: string,
): Promise<AwardCeremony | null> {
  const data = await deps.timeline.loadCareerTimelineData(saveGameId);
  if (!data) return null;

  const claimable = claimableHonours(data);
  if (claimable.length === 0) return null;

  const profile = await deps.profile.getProfile(saveGameId);
  const celebrated = new Set(profile?.celebratedHonourIds ?? []);
  const pending = claimable
    .filter((honour) => !celebrated.has(honour.id))
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const honour = pending[0];
  if (!honour) return null;

  const player = await deps.editor.loadEditablePlayer(saveGameId);
  const isPersonal = PERSONAL.has(honour.type);

  return {
    honourId: honour.id,
    type: honour.type,
    label: CEREMONY_LABELS[honour.type]!,
    isPersonal,
    competitionName: honour.competitionName,
    seasonLabel: honour.seasonLabel,
    clubName: honour.clubName,
    colors: isPersonal || !honour.clubName ? GOLD : clubColors(honour.clubName),
    playerName: player
      ? `${player.firstName} ${player.lastName}`
      : 'Il protagonista',
    avatarDataUrl: profile?.avatarDataUrl ?? null,
    careerTotal: claimable.length - pending.length + 1,
  };
}

/** Called once the ceremony has played: never show that trophy again. */
export async function markCeremonySeen(
  deps: Pick<AwardCeremonyDeps, 'profile'>,
  saveGameId: string,
  honourId: string,
): Promise<boolean> {
  const profile = await deps.profile.getProfile(saveGameId);
  if (!profile) return false;
  const celebrated = new Set(profile.celebratedHonourIds ?? []);
  celebrated.add(honourId);
  return deps.profile.setCelebratedHonours(saveGameId, [...celebrated]);
}
