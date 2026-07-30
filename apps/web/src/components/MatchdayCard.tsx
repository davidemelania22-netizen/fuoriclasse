import type { LineupEntry, MatchdayReport } from '../api/client';

interface MatchdayCardProps {
  match: MatchdayReport;
}

const EVENT_ICON: Record<string, string> = {
  GOAL: '⚽',
  YELLOW_CARD: '🟨',
  RED_CARD: '🟥',
};

const APPROACH_LABELS: Record<string, string> = {
  DEFENSIVE: 'Prudente',
  BALANCED: 'Equilibrato',
  ATTACKING: 'Offensivo',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function ratingTone(rating: number): string {
  if (rating >= 7) return 'tone-good';
  if (rating >= 6) return 'tone-warn';
  return 'tone-bad';
}

function Lineup({ title, players }: { title: string; players: LineupEntry[] }) {
  return (
    <div className="lineup">
      <h4>{title}</h4>
      <ul className="lineup-list">
        {players.map((p) => (
          <li
            key={p.playerId}
            className={
              p.isProtagonist ? 'lineup-row lineup-row-you' : 'lineup-row'
            }
          >
            <span className="lineup-pos">{p.position}</span>
            <span className="lineup-name">{p.playerName}</span>
            {(p.goals > 0 ||
              p.assists > 0 ||
              p.yellowCards > 0 ||
              p.redCards > 0) && (
              <span className="lineup-events">
                {p.goals > 0 && `⚽×${p.goals} `}
                {p.assists > 0 && `🅰️×${p.assists} `}
                {p.yellowCards > 0 && '🟨 '}
                {p.redCards > 0 && '🟥 '}
              </span>
            )}
            <span className={`chip ${ratingTone(p.rating)}`}>
              {p.rating.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchdayCard({ match }: MatchdayCardProps) {
  const won = match.isHome
    ? match.homeGoals > match.awayGoals
    : match.awayGoals > match.homeGoals;
  const lost = match.isHome
    ? match.homeGoals < match.awayGoals
    : match.awayGoals < match.homeGoals;
  const resultTone = won ? 'tone-good' : lost ? 'tone-bad' : 'tone-warn';

  return (
    <article className="card matchday" aria-label="Giorno della partita">
      <header className="card-head">
        <h3>Giorno della partita</h3>
        <span className="badge">{formatDate(match.date)}</span>
      </header>
      <p className="matchday-competition">
        {match.competitionName}
        {match.isDerby && <span className="derby-badge">DERBY</span>}
        {match.approach && (
          <span className="matchday-approach">
            Approccio: {APPROACH_LABELS[match.approach] ?? match.approach}
          </span>
        )}
      </p>

      <div className="matchday-result">
        <span className={match.isHome ? 'matchday-team you' : 'matchday-team'}>
          {match.homeClubName}
        </span>
        <span className={`matchday-score ${resultTone}`}>
          {match.homeGoals} - {match.awayGoals}
        </span>
        <span className={!match.isHome ? 'matchday-team you' : 'matchday-team'}>
          {match.awayClubName}
        </span>
      </div>

      {match.keyMoments.length > 0 && (
        <div className="key-moments">
          <h4>Momenti chiave</h4>
          <ul className="key-moments-list">
            {match.keyMoments.map((m, i) => (
              <li key={i} className={`key-moment ${m.success ? 'ok' : 'ko'}`}>
                <span className="key-moment-icon">
                  {m.success ? '✅' : '❌'}
                </span>
                <span className="key-moment-text">
                  <em>{m.choiceLabel}:</em> {m.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.liveFeed.length > 0 && (
        <div className="live-feed">
          <h4>Cronaca minuto per minuto</h4>
          <ul className="live-feed-list">
            {match.liveFeed.map((line, i) => (
              <li key={i} className="live-feed-item">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.pagella ? (
        <div className="pagella">
          <div className="pagella-head">
            <span className="pagella-label">Pagella</span>
            <span
              className={`pagella-rating ${ratingTone(match.pagella.rating)}`}
            >
              {match.pagella.rating.toFixed(1)}
            </span>
          </div>
          <p className="pagella-comment">{match.pagella.comment}</p>
        </div>
      ) : (
        <p className="empty">Non hai giocato questa partita.</p>
      )}

      {match.tabellino.length > 0 && (
        <div className="tabellino">
          <h4>Tabellino</h4>
          <ul className="tabellino-list">
            {match.tabellino.map((e, i) => (
              <li key={i} className="tabellino-row">
                <span className="tabellino-minute">{e.minute}&apos;</span>
                <span>{EVENT_ICON[e.type]}</span>
                <span className="tabellino-player">{e.playerName}</span>
                {e.assistPlayerName && (
                  <span className="tabellino-assist">
                    (ass. {e.assistPlayerName})
                  </span>
                )}
                <span className="tabellino-club">{e.clubName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="lineups">
        <Lineup title={match.homeClubName} players={match.homeLineup} />
        <Lineup title={match.awayClubName} players={match.awayLineup} />
      </div>
    </article>
  );
}
