import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type CalendarDayView, type CalendarEntry } from '../api/client';
import { useGameStore } from '../stores/useGameStore';

interface CalendarPageProps {
  saveId: string;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Monday-first column index (0..6) of a YYYY-MM-DD day. */
const weekdayOf = (date: string) =>
  (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

function MatchEntry({
  entry,
}: {
  entry: Extract<CalendarEntry, { kind: 'MATCH' }>;
}) {
  const played = entry.outcome !== null;
  const outcomeClass = played
    ? `cal-match-${entry.outcome!.toLowerCase()}`
    : 'cal-match-upcoming';
  return (
    <div
      className={`cal-match ${outcomeClass}`}
      title={`${entry.competitionName} · ${
        entry.isHome ? 'in casa' : 'in trasferta'
      } contro ${entry.opponentName}`}
    >
      <span className="cal-match-line">
        <span aria-hidden>{entry.isHome ? '🏠' : '✈️'}</span>{' '}
        {entry.opponentName}
      </span>
      {played ? (
        <span className="cal-match-result">
          <strong>{entry.scoreLine}</strong>
          {entry.rating !== null && (
            <span className="cal-rating">{entry.rating.toFixed(1)}</span>
          )}
          {entry.goals > 0 && (
            <span>⚽{entry.goals > 1 ? `×${entry.goals}` : ''}</span>
          )}
          {entry.assists > 0 && (
            <span>🅰️{entry.assists > 1 ? `×${entry.assists}` : ''}</span>
          )}
        </span>
      ) : (
        <span className="cal-match-result cal-match-kickoff">
          {entry.competitionName}
        </span>
      )}
    </div>
  );
}

function DayCell({
  day,
  currentDate,
}: {
  day: CalendarDayView;
  currentDate: string;
}) {
  const matches = day.entries.filter((e) => e.kind === 'MATCH');
  const injuries = day.entries.filter((e) => e.kind === 'INJURY');
  const news = day.entries.filter((e) => e.kind === 'NEWS');
  const classes = [
    'cal-day',
    day.isToday ? 'cal-today' : '',
    day.date < currentDate ? 'cal-past' : '',
    day.injured ? 'cal-injured' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <span className="cal-daynum">
        {Number(day.date.slice(8))}
        {day.isToday && <span className="cal-today-tag">OGGI</span>}
      </span>
      {matches.map((entry) =>
        entry.kind === 'MATCH' ? (
          <MatchEntry key={entry.fixtureId} entry={entry} />
        ) : null,
      )}
      {injuries.map((entry, i) =>
        entry.kind === 'INJURY' ? (
          <div
            key={i}
            className={`cal-injury ${entry.phase === 'END' ? 'cal-injury-end' : ''}`}
            title={entry.label}
          >
            {entry.phase === 'START' ? `🚑 ${entry.label}` : '✅ Rientro'}
          </div>
        ) : null,
      )}
      {news.length > 0 && (
        <div
          className="cal-news"
          title={news
            .map((entry) => (entry.kind === 'NEWS' ? entry.headline : ''))
            .join('\n')}
        >
          📰 {news.length > 1 ? `${news.length} notizie` : 'notizia'}
        </div>
      )}
    </div>
  );
}

export function CalendarPage({ saveId }: CalendarPageProps) {
  const close = useGameStore((s) => s.closeOverlay);
  const [month, setMonth] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['calendar', saveId, month],
    queryFn: () => api.getCalendar(saveId, month ?? undefined),
  });
  const view = query.data;

  const leading = view ? weekdayOf(view.days[0]!.date) : 0;
  const currentMonth = view ? view.currentDate.slice(0, 7) : null;

  return (
    <div className="page page-wide">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>📅 Calendario</strong>
      </div>

      {query.isLoading && (
        <section className="card">
          <p className="empty">Caricamento…</p>
        </section>
      )}
      {query.isError && (
        <section className="card">
          <p className="error">Impossibile caricare il calendario.</p>
        </section>
      )}

      {view && (
        <section className="card">
          <div className="cal-header">
            <button
              type="button"
              className="ghost cal-nav"
              disabled={!view.nav.prev}
              onClick={() => setMonth(view.nav.prev)}
            >
              ‹
            </button>
            <div className="cal-title">
              <h2>{monthLabel(view.month)}</h2>
              {view.clubName && <p className="cal-club">{view.clubName}</p>}
            </div>
            <div className="cal-header-actions">
              {currentMonth && view.month !== currentMonth && (
                <button
                  type="button"
                  className="ghost cal-nav-today"
                  onClick={() => setMonth(currentMonth)}
                >
                  Oggi
                </button>
              )}
              <button
                type="button"
                className="ghost cal-nav"
                disabled={!view.nav.next}
                onClick={() => setMonth(view.nav.next)}
              >
                ›
              </button>
            </div>
          </div>

          <div className="cal-grid">
            {WEEKDAYS.map((d) => (
              <span key={d} className="cal-weekday">
                {d}
              </span>
            ))}
            {leading > 0 && (
              <span
                className="cal-blank"
                style={{ gridColumn: `span ${leading}` }}
              />
            )}
            {view.days.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                currentDate={view.currentDate}
              />
            ))}
          </div>

          <div className="cal-legend">
            <span>
              <i className="cal-dot cal-dot-w" /> Vittoria
            </span>
            <span>
              <i className="cal-dot cal-dot-d" /> Pareggio
            </span>
            <span>
              <i className="cal-dot cal-dot-l" /> Sconfitta
            </span>
            <span>
              <i className="cal-dot cal-dot-next" /> Da giocare
            </span>
            <span>🚑 Infortunio</span>
            <span>📰 Notizie del giorno</span>
          </div>
        </section>
      )}
    </div>
  );
}
