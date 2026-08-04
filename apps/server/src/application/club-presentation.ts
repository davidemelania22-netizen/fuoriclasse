import { clubColors } from '@football-life/game-data';
import type { CareerRepository } from '../repositories/career-repository';
import type { EditorRepository } from '../repositories/editor-repository';
import type { ProfileRepository } from '../repositories/profile-repository';
import type { SaveGameRepository } from '../repositories/save-game-repository';

/**
 * The moment a player is unveiled at a new club.
 *
 * Nothing signals this: it is *derived*. If the club under contract is not
 * the club whose presentation was last watched, one is owed. That way every
 * route into a squad — signing as a free agent, accepting a transfer offer,
 * a quick-start auto-signature, a loan, anything added later — produces the
 * scene without a single line in the signing code, and a save created before
 * this feature gets its presentation the next time it is opened.
 */
export interface ClubPresentation {
  /**
   * Which moment this is. A SIGNING is the unveiling at a club you have just
   * joined; a RENEWAL is the far quieter one where you sign to stay.
   */
  kind: 'SIGNING' | 'RENEWAL';
  clubId: string;
  clubName: string;
  /** Crest as a data URL when the club has one, else null. */
  clubLogo: string | null;
  competitionName: string | null;
  colors: {
    primary: string;
    secondary: string;
    onPrimary: string;
    onDark: string;
  };
  playerName: string;
  /** The protagonist's own photo, when they uploaded one. */
  avatarDataUrl: string | null;
  weeklyWage: number;
  squadRole: string;
  /** Contract length in whole years, rounded to the nearest one. */
  contractYears: number;
  /** In-world year of the unveiling. */
  year: number;
  /** Surname alone: what actually goes on the back of a shirt. */
  shirtName: string;
  /** Squad number, assigned from the position. */
  shirtNumber: number;
}

/**
 * Squad numbers by position, in the order a club hands them out. The game
 * has never stored a shirt number — it needs one only now, to print on the
 * back of the shirt — so it is derived from the player id and stays the
 * same every time the scene is replayed.
 */
const NUMBERS_BY_POSITION: Record<string, readonly number[]> = {
  GK: [1, 12, 22, 31],
  DF: [2, 3, 4, 5, 6, 13, 15, 24],
  MF: [8, 14, 16, 18, 20, 23],
  WG: [7, 11, 17, 27, 30],
  FW: [9, 10, 19, 21, 29, 99],
};

function shirtNumberFor(playerId: string, position: string): number {
  const pool = NUMBERS_BY_POSITION[position] ?? NUMBERS_BY_POSITION.MF!;
  let hash = 0;
  for (let i = 0; i < playerId.length; i += 1) {
    hash = (hash * 31 + playerId.charCodeAt(i)) % 100_000;
  }
  return pool[hash % pool.length]!;
}

export interface ClubPresentationDeps {
  career: CareerRepository;
  profile: ProfileRepository;
  editor: EditorRepository;
  saveGame: SaveGameRepository;
}

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export async function getClubPresentation(
  deps: ClubPresentationDeps,
  saveGameId: string,
): Promise<ClubPresentation | null> {
  const career = await deps.career.loadProtagonist(saveGameId);
  if (!career?.clubId || !career.currentContract) return null;

  const profile = await deps.profile.getProfile(saveGameId);
  // Arriving somewhere new comes first: if a transfer and a renewal are both
  // outstanding, the unveiling is the bigger moment and the renewal is moot.
  const arriving = profile?.lastPresentedClubId !== career.clubId;
  const staying =
    !arriving && profile?.pendingRenewal?.clubId === career.clubId;
  if (!arriving && !staying) return null;

  const club = (await deps.career.listClubDirectory(saveGameId)).find(
    (candidate) => candidate.clubId === career.clubId,
  );
  if (!club) return null;

  const player = await deps.editor.loadEditablePlayer(saveGameId);
  const game = await deps.saveGame.loadGame(saveGameId);

  const years = Math.max(
    1,
    Math.round(
      (career.currentContract.endDate.getTime() -
        career.currentDate.getTime()) /
        YEAR_MS,
    ),
  );

  return {
    kind: arriving ? 'SIGNING' : 'RENEWAL',
    clubId: club.clubId,
    clubName: club.name,
    clubLogo: club.logo ?? null,
    competitionName: club.competitionName ?? null,
    colors: clubColors(club.name),
    playerName: player
      ? `${player.firstName} ${player.lastName}`
      : 'Il protagonista',
    avatarDataUrl: profile?.avatarDataUrl ?? null,
    weeklyWage: career.currentContract.weeklyWage,
    squadRole: career.currentContract.squadRole,
    contractYears: years,
    year: career.currentDate.getUTCFullYear(),
    shirtName: (player?.lastName ?? 'GIOCATORE').toUpperCase(),
    shirtNumber: shirtNumberFor(
      career.playerId,
      game?.player?.primaryPosition ?? 'MF',
    ),
  };
}

/** Called once the scene has played (or been skipped): do not show it again. */
export async function markPresentationSeen(
  deps: Pick<ClubPresentationDeps, 'career' | 'profile'>,
  saveGameId: string,
): Promise<boolean> {
  const career = await deps.career.loadProtagonist(saveGameId);
  if (!career?.clubId) return false;
  // Clearing both is right whichever scene just played: an unveiling at a new
  // club makes any older pending renewal irrelevant.
  await deps.profile.setPendingRenewal(saveGameId, null);
  return deps.profile.setLastPresentedClub(saveGameId, career.clubId);
}
