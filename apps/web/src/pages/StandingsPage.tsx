import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type LeagueTable } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { countryLabels } from '../i18n';

interface StandingsPageProps {
  saveId: string;
}

function LeagueTableView({ league }: { league: LeagueTable }) {
  return (
    <section className="card standings-card">
      <div className="standings-head">
        <h2>
          {league.competitionLogo && (
            <img
              className="club-logo comp-logo"
              src={league.competitionLogo}
              alt=""
            />
          )}
          {league.competitionName}
        </h2>
        <span className="standings-season">{league.seasonLabel}</span>
      </div>
      <div className="standings-scroll">
        <table className="standings-table">
          <thead>
            <tr>
              <th className="col-pos">#</th>
              <th className="col-club">Squadra</th>
              <th>PG</th>
              <th>V</th>
              <th>N</th>
              <th>P</th>
              <th>DR</th>
              <th className="col-pts">Pt</th>
            </tr>
          </thead>
          <tbody>
            {league.rows.map((row) => (
              <tr
                key={row.clubId}
                className={row.isProtagonistClub ? 'standings-you' : undefined}
              >
                <td className="col-pos">{row.position}</td>
                <td className="col-club">
                  {row.clubLogo && (
                    <img className="club-logo" src={row.clubLogo} alt="" />
                  )}
                  {row.clubName}
                  {row.isProtagonistClub && (
                    <span className="standings-badge">tu</span>
                  )}
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>
                  {row.goalDifference > 0 ? '+' : ''}
                  {row.goalDifference}
                </td>
                <td className="col-pts">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StandingsPage({ saveId }: StandingsPageProps) {
  const close = useGameStore((s) => s.closeOverlay);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const query = useQuery({
    queryKey: ['standings', saveId],
    queryFn: () => api.getStandings(saveId),
  });

  const leagues = query.data ?? [];
  const countries = [...new Set(leagues.map((l) => l.countryId ?? '—'))];
  const visible =
    filter === 'mine' ? leagues.filter((l) => l.hasProtagonist) : leagues;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>Classifiche</strong>
        <div className="standings-filter">
          <button
            type="button"
            className={filter === 'all' ? undefined : 'ghost'}
            onClick={() => setFilter('all')}
          >
            Tutto il mondo
          </button>
          <button
            type="button"
            className={filter === 'mine' ? undefined : 'ghost'}
            onClick={() => setFilter('mine')}
          >
            Il mio campionato
          </button>
        </div>
      </div>

      {query.isLoading && <p className="empty">Caricamento classifiche…</p>}
      {query.data && leagues.length === 0 && (
        <p className="empty">
          Nessun campionato in questo mondo. Le classifiche appariranno con la
          nuova stagione.
        </p>
      )}

      {filter === 'all' && countries.length > 1
        ? countries.map((country) => (
            <div key={country}>
              <h3 className="standings-country">
                {countryLabels[country] ?? country}
              </h3>
              {visible
                .filter((l) => (l.countryId ?? '—') === country)
                .map((league) => (
                  <LeagueTableView key={league.competitionId} league={league} />
                ))}
            </div>
          ))
        : visible.map((league) => (
            <LeagueTableView key={league.competitionId} league={league} />
          ))}
    </div>
  );
}
