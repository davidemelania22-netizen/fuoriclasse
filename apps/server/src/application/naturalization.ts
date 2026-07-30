import { COUNTRIES } from '@football-life/game-data';
import { evaluateNaturalization } from '@football-life/simulation-engine';
import type { NaturalizationRepository } from '../repositories/naturalization-repository';
import type {
  ProfileRepository,
  StoredNaturalization,
} from '../repositories/profile-repository';
import type { NewsItemInput } from '../repositories/news-repository';

export interface NaturalizationDeps {
  naturalization: NaturalizationRepository;
  profile: ProfileRepository;
}

const countryName = (id: string): string =>
  COUNTRIES.find((country) => country.id === id)?.name ?? id;

// Italian articles: "l'Italia" but "la Germania". Without this the news read
// "la Italia", which no Italian would write.
const startsWithVowel = (name: string): boolean =>
  /^[aeiouàèéìòù]/i.test(name.trim());
const la = (name: string): string =>
  startsWithVowel(name) ? `l'${name}` : `la ${name}`;
const alla = (name: string): string =>
  startsWithVowel(name) ? `all'${name}` : `alla ${name}`;
const della = (name: string): string =>
  startsWithVowel(name) ? `dell'${name}` : `della ${name}`;

export interface NaturalizationOfferResult {
  offer: StoredNaturalization;
  news: NewsItemInput[];
}

/**
 * The host federation comes knocking once the player has served their years
 * in the country. Offered at most once per career: a refusal is final, so
 * loyalty actually costs something.
 */
export async function maybeOfferNaturalization(
  deps: NaturalizationDeps,
  input: { saveGameId: string; gameDate: Date },
): Promise<NaturalizationOfferResult | null> {
  // Cheap bail-out first: this runs every week of every career.
  const profile = await deps.profile.getProfile(input.saveGameId);
  if (!profile || profile.naturalization) return null;

  const context = await deps.naturalization.loadContext(input.saveGameId);
  if (!context) return null;

  const verdict = evaluateNaturalization({
    nationalityId: context.nationalityId,
    clubCountryId: context.clubCountryId,
    seasonsInCountry: context.seasonsInClubCountry,
    alreadyNaturalised: context.secondaryNationalityId !== null,
    cappedForCountryId: profile.cappedForCountryId,
  });
  if (!verdict.eligible || !context.clubCountryId) return null;

  const host = countryName(context.clubCountryId);
  const previous = countryName(context.nationalityId);
  const offer: StoredNaturalization = {
    status: 'PENDING',
    countryId: context.clubCountryId,
    countryName: host,
    previousCountryId: context.nationalityId,
    previousCountryName: previous,
    seasonLabel: context.seasonLabel,
  };
  await deps.profile.setNaturalization(input.saveGameId, offer);

  return {
    offer,
    news: [
      {
        gameDate: input.gameDate,
        category: 'NATIONAL',
        headline: `La federazione ${host} ti vuole naturalizzare`,
        body: `Dopo ${verdict.seasonsInCountry} stagioni giocate qui, ${la(host)} ti apre le porte della sua nazionale. Accettare significa rinunciare per sempre ${alla(previous)}.`,
      },
    ],
  };
}

export type NaturalizationDecision =
  | { status: 'ok'; naturalization: StoredNaturalization }
  | { status: 'no-pending' }
  /** The offer was on the table but the player is no longer allowed to take it. */
  | { status: 'blocked'; naturalization: StoredNaturalization };

/**
 * Answer the federation. Accepting rewrites the passport, so from the next
 * call-up the player is picked under the new flag; declining closes the door
 * for good.
 */
export async function decideNaturalization(
  deps: NaturalizationDeps,
  input: { saveGameId: string; accept: boolean; gameDate: Date },
): Promise<NaturalizationDecision & { news?: NewsItemInput[] }> {
  const profile = await deps.profile.getProfile(input.saveGameId);
  const pending = profile?.naturalization;
  if (!pending || pending.status !== 'PENDING') return { status: 'no-pending' };

  const context = await deps.naturalization.loadContext(input.saveGameId);

  // The offer can go stale while it sits there: answering a call-up in the
  // meantime ties the player to their nation, and a transfer can take them
  // out of the country. Re-check before granting the passport.
  if (input.accept) {
    const verdict = evaluateNaturalization({
      nationalityId: pending.previousCountryId,
      clubCountryId: context?.clubCountryId ?? null,
      seasonsInCountry: context?.seasonsInClubCountry ?? 0,
      alreadyNaturalised: context?.secondaryNationalityId !== null,
      cappedForCountryId: profile.cappedForCountryId,
    });
    if (!verdict.eligible) {
      const closed: StoredNaturalization = { ...pending, status: 'DECLINED' };
      await deps.profile.setNaturalization(input.saveGameId, closed);
      return {
        status: 'blocked',
        naturalization: closed,
        news: [
          {
            gameDate: input.gameDate,
            category: 'NATIONAL',
            headline: `Niente passaporto ${pending.countryName}`,
            body:
              verdict.block === 'CAPPED'
                ? `Hai già risposto alla chiamata della tua nazionale: le regole non ti permettono più di cambiare bandiera.`
                : `Le condizioni non ci sono più: la pratica con ${la(pending.countryName)} si chiude qui.`,
          },
        ],
      };
    }
  }

  const updated: StoredNaturalization = {
    ...pending,
    status: input.accept ? 'ACCEPTED' : 'DECLINED',
  };
  await deps.profile.setNaturalization(input.saveGameId, updated);

  if (!input.accept) {
    return {
      status: 'ok',
      naturalization: updated,
      news: [
        {
          gameDate: input.gameDate,
          category: 'NATIONAL',
          headline: `Resti fedele ${alla(pending.previousCountryName)}`,
          body: `Hai detto no ${alla(pending.countryName)}: la tua nazionale resta quella di sempre, qualunque cosa accada.`,
        },
      ],
    };
  }

  if (context) {
    await deps.naturalization.applyNaturalization({
      personId: context.personId,
      newNationalityId: pending.countryId,
      previousNationalityId: pending.previousCountryId,
    });
  }

  return {
    status: 'ok',
    naturalization: updated,
    news: [
      {
        gameDate: input.gameDate,
        category: 'NATIONAL',
        headline: `Ora giochi per ${la(pending.countryName)}`,
        body: `Passaporto firmato: lasci ${la(pending.previousCountryName)} e ti metti a disposizione ${della(pending.countryName)}. La prossima convocazione arriverà da loro.`,
      },
    ],
  };
}
