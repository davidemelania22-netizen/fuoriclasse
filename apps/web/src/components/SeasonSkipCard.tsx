import type { SeasonSkipSummary } from '../api/client';

/**
 * Match ratings live on the 1-10 pagella scale, which is centred around 6:
 * they need their own bands, not the 0-20 attribute wording.
 */
const RATING_BANDS: { max: number; word: string; tone: string }[] = [
  { max: 5.5, word: 'Insufficiente', tone: 'word-poor' },
  { max: 6.2, word: 'Sufficiente', tone: 'word-weak' },
  { max: 6.6, word: 'Discreto', tone: 'word-fair' },
  { max: 7.0, word: 'Buono', tone: 'word-good' },
  { max: 7.5, word: 'Ottimo', tone: 'word-great' },
  { max: 8.2, word: 'Eccellente', tone: 'word-elite' },
  { max: 10, word: 'Da fuoriclasse', tone: 'word-class' },
];

const ratingBand = (rating: number) =>
  RATING_BANDS.find((band) => rating <= band.max) ?? RATING_BANDS.at(-1)!;

const TITLE_ICONS: Record<string, string> = {
  LEAGUE_TITLE: '🏆',
  NATIONAL_CUP: '🥇',
  CONTINENTAL_CUP: '🌍',
  INTERNATIONAL: '🏅',
};

const TITLE_LABELS: Record<string, string> = {
  LEAGUE_TITLE: 'Campionato',
  NATIONAL_CUP: 'Coppa nazionale',
  CONTINENTAL_CUP: 'Coppa europea',
  INTERNATIONAL: 'Torneo internazionale',
};

/** End-of-season report shown after skipping straight to the finish line. */
export function SeasonSkipCard({
  summary,
  onDismiss,
}: {
  summary: SeasonSkipSummary;
  onDismiss: () => void;
}) {
  const band =
    summary.averageRating !== null ? ratingBand(summary.averageRating) : null;

  return (
    <section className="card season-skip">
      <div className="season-skip-head">
        <h2>
          🏁 Stagione {summary.seasonLabel ?? ''} conclusa
          {summary.clubName ? ` · ${summary.clubName}` : ''}
        </h2>
        <button type="button" className="ghost" onClick={onDismiss}>
          Chiudi
        </button>
      </div>

      {!summary.seasonCompleted && (
        <p className="season-skip-note">
          {summary.retired
            ? 'La tua carriera si è chiusa prima della fine della stagione.'
            : 'Simulazione interrotta prima della fine della stagione.'}
        </p>
      )}

      <div className="season-skip-grid">
        <div className="season-skip-stat">
          <span className="season-skip-value">{summary.goals}</span>
          <span className="season-skip-label">Gol</span>
        </div>
        <div className="season-skip-stat">
          <span className="season-skip-value">{summary.assists}</span>
          <span className="season-skip-label">Assist</span>
        </div>
        <div className="season-skip-stat">
          <span className="season-skip-value">
            {summary.averageRating?.toFixed(1) ?? '—'}
          </span>
          <span className="season-skip-label">Media voto</span>
        </div>
        <div className="season-skip-stat">
          <span className="season-skip-value">{summary.appearances}</span>
          <span className="season-skip-label">Presenze</span>
        </div>
      </div>

      {band && (
        <p className="season-skip-verdict">
          Il tuo rendimento: <strong className={band.tone}>{band.word}</strong>{' '}
          in {summary.appearances}{' '}
          {summary.appearances === 1 ? 'partita' : 'partite'} su{' '}
          {summary.matchesPlayedByClub} della squadra.
        </p>
      )}
      {summary.averageRating === null && (
        <p className="season-skip-verdict">
          Non sei mai sceso in campo: il mister non ti ha mai schierato in{' '}
          {summary.matchesPlayedByClub} partite.
        </p>
      )}

      <div className="season-skip-rows">
        <div className="season-skip-row">
          <span>🏆 Titoli vinti</span>
          <span>
            {summary.titles.length === 0 ? (
              <em className="season-skip-empty">Nessuno</em>
            ) : (
              summary.titles.map((title, i) => (
                <span key={i} className="chip chip-accent">
                  {TITLE_ICONS[title.type] ?? '🏆'}{' '}
                  {title.competitionName ||
                    TITLE_LABELS[title.type] ||
                    title.type}
                </span>
              ))
            )}
          </span>
        </div>
        <div className="season-skip-row">
          <span>🎖️ Premi individuali</span>
          <span>
            {summary.awards.length === 0 ? (
              <em className="season-skip-empty">Nessuno</em>
            ) : (
              summary.awards.map((award, i) => (
                <span key={i} className="chip chip-accent">
                  {award.label}
                </span>
              ))
            )}
          </span>
        </div>
        <div className="season-skip-row">
          <span>📊 Bilancio squadra</span>
          <span>
            {summary.won}V · {summary.drawn}N · {summary.lost}P
          </span>
        </div>
        <div className="season-skip-row">
          <span>🟨 Cartellini</span>
          <span>
            {summary.yellowCards} gialli · {summary.redCards} rossi
          </span>
        </div>
        <div className="season-skip-row">
          <span>📈 Crescita</span>
          <span>
            {Math.round(summary.abilityBefore / 5)} →{' '}
            <strong>{Math.round(summary.abilityAfter / 5)}</strong> ·{' '}
            {summary.injuriesSustained} infortuni · {summary.weeksSimulated}{' '}
            settimane
          </span>
        </div>
      </div>
    </section>
  );
}
