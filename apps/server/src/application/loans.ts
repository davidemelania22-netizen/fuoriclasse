import { createRandomSource } from '@football-life/simulation-engine';
import type {
  LoanRepository,
  LoanCandidate,
} from '../repositories/loan-repository';
import type {
  ProfileRepository,
  StoredLoanOffer,
} from '../repositories/profile-repository';
import type { NewsItemInput } from '../repositories/news-repository';

/** Loans are a young player's story: past this age the club sells instead. */
const MAX_LOAN_AGE = 22;
/** Below this many league appearances the club looks for playing time elsewhere. */
const BENCH_APPEARANCES = 4;
/** Manager trust under which the club stops counting on the player. */
const BENCH_TRUST = 50;
const OPTIONS_OFFERED = 3;
/** A loan spell resets the pecking order: the new club judges from scratch. */
const LOAN_START_TRUST = 55;

export interface LoanDeps {
  loans: LoanRepository;
  profile: ProfileRepository;
}

export interface LoanOfferResult {
  offer: StoredLoanOffer;
  news: NewsItemInput[];
}

/**
 * The parent club shops a benched youngster around the division below. Offers
 * at most once per season, and only while the player is young and not playing.
 */
export async function maybeOfferLoan(
  deps: LoanDeps,
  input: { saveGameId: string; seed: string; gameDate: Date },
): Promise<LoanOfferResult | null> {
  // Cheap bail-out first: a player already out on loan costs nothing to skip,
  // and this runs every single week of every career.
  const profile = await deps.profile.getProfile(input.saveGameId);
  if (!profile || profile.activeLoan) return null;

  const context = await deps.loans.loadContext(input.saveGameId);
  if (!context) return null;
  if (!context.clubId || !context.countryId || context.tier === null) {
    return null;
  }
  if (!context.seasonLabel) return null;
  if (context.age > MAX_LOAN_AGE) return null;
  // Already handled this season (offered, accepted or turned down).
  if (profile.loanOffer?.seasonLabel === context.seasonLabel) return null;

  const benched =
    context.appearancesThisSeason < BENCH_APPEARANCES &&
    (profile.managerTrust === null || profile.managerTrust < BENCH_TRUST);
  if (!benched) return null;

  const candidates = await deps.loans.listCandidates(
    input.saveGameId,
    context.countryId,
    context.tier + 1,
  );
  if (candidates.length === 0) return null;

  const options = pickOptions(
    candidates,
    context.clubId,
    `${input.seed}:loan:${context.seasonLabel}`,
  );
  if (options.length === 0) return null;

  const offer: StoredLoanOffer = {
    seasonLabel: context.seasonLabel,
    status: 'PENDING',
    parentClubName: context.clubName ?? 'Il club',
    options,
  };
  await deps.profile.setLoanOffer(input.saveGameId, offer);

  return {
    offer,
    news: [
      {
        gameDate: input.gameDate,
        category: 'TRANSFER',
        headline: `${context.clubName} valuta di mandarti in prestito`,
        body: `Non stai trovando spazio: la società ha aperto ai prestiti. ${options
          .map((option) => option.clubName)
          .join(', ')} hanno chiesto di te.`,
      },
    ],
  };
}

/** Deterministic spread of destinations: a strong one, a mid one, a modest one. */
function pickOptions(
  candidates: LoanCandidate[],
  parentClubId: string,
  seed: string,
): LoanCandidate[] {
  const pool = candidates.filter((club) => club.clubId !== parentClubId);
  if (pool.length <= OPTIONS_OFFERED) return pool;
  const rng = createRandomSource(seed);
  const bandSize = Math.floor(pool.length / OPTIONS_OFFERED);
  return Array.from({ length: OPTIONS_OFFERED }, (_, band) => {
    const start = band * bandSize;
    const end = band === OPTIONS_OFFERED - 1 ? pool.length : start + bandSize;
    return pool[rng.integer(start, end - 1)]!;
  });
}

export type LoanDecision =
  | { status: 'ok'; accepted: boolean; clubName: string | null }
  | { status: 'no-offer' }
  | { status: 'invalid-club' };

/**
 * Accepting moves the shirt (the contract stays at the parent club) and hands
 * the player a clean slate with the new manager.
 */
export async function decideLoan(
  deps: LoanDeps,
  input: { saveGameId: string; accept: boolean; clubId?: string | undefined },
): Promise<LoanDecision> {
  const [context, profile] = await Promise.all([
    deps.loans.loadContext(input.saveGameId),
    deps.profile.getProfile(input.saveGameId),
  ]);
  const offer = profile?.loanOffer;
  if (!context || !profile || !offer || offer.status !== 'PENDING') {
    return { status: 'no-offer' };
  }

  if (!input.accept) {
    await deps.profile.setLoanOffer(input.saveGameId, {
      ...offer,
      status: 'DECLINED',
    });
    return { status: 'ok', accepted: false, clubName: null };
  }

  const chosen = offer.options.find((option) => option.clubId === input.clubId);
  if (!chosen || !context.clubId) return { status: 'invalid-club' };

  await deps.loans.moveToClub(context.playerId, chosen.clubId);
  await deps.profile.setActiveLoan(input.saveGameId, {
    parentClubId: context.clubId,
    parentClubName: context.clubName ?? 'Il club',
    loanClubId: chosen.clubId,
    loanClubName: chosen.clubName,
    seasonLabel: offer.seasonLabel,
  });
  await deps.profile.setLoanOffer(input.saveGameId, {
    ...offer,
    status: 'ACCEPTED',
  });
  await deps.profile.setManagerTrust(input.saveGameId, LOAN_START_TRUST);

  return { status: 'ok', accepted: true, clubName: chosen.clubName };
}

/**
 * At the season boundary the loan expires and the player reports back to the
 * parent club. Returns the news of the homecoming, if one happened.
 */
export async function returnFromLoanIfDue(
  deps: LoanDeps,
  input: { saveGameId: string; newSeasonLabel: string; gameDate: Date },
): Promise<NewsItemInput[]> {
  const profile = await deps.profile.getProfile(input.saveGameId);
  const loan = profile?.activeLoan;
  if (!loan) return [];
  if (loan.seasonLabel === input.newSeasonLabel) return [];

  const context = await deps.loans.loadContext(input.saveGameId);
  if (!context) return [];
  // If the parent club sold them on during the window, respect that move.
  if (context.clubId !== loan.loanClubId) {
    await deps.profile.setActiveLoan(input.saveGameId, null);
    return [];
  }

  await deps.loans.moveToClub(context.playerId, loan.parentClubId);
  await deps.profile.setActiveLoan(input.saveGameId, null);
  return [
    {
      gameDate: input.gameDate,
      category: 'TRANSFER',
      headline: `Rientro dal prestito: torni al ${loan.parentClubName}`,
      body: `L'esperienza al ${loan.loanClubName} è finita. Ora tocca a te convincere il mister del ${loan.parentClubName}.`,
    },
  ];
}
