import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { buildCareerCardData, careerCardFileName } from '../utils/careerCard';
import { downloadDataUrl, renderCareerCard } from '../utils/careerCardImage';

interface CareerPageProps {
  saveId: string;
}

const GRADE_ICON: Record<string, string> = {
  LEGGENDA: '👑',
  STELLA: '⭐',
  PROFESSIONISTA: '🛡️',
  COMPRIMARIO: '🎽',
  METEORA: '☄️',
};

export function CareerPage({ saveId }: CareerPageProps) {
  const close = useGameStore((s) => s.closeOverlay);

  const legacyQuery = useQuery({
    queryKey: ['legacy', saveId],
    queryFn: () => api.getLegacy(saveId),
  });
  const statsQuery = useQuery({
    queryKey: ['season-stats', saveId],
    queryFn: () => api.getSeasonStats(saveId),
  });
  const timelineQuery = useQuery({
    queryKey: ['career-timeline', saveId],
    queryFn: () => api.getCareerTimeline(saveId),
  });
  const avatarQuery = useQuery({
    queryKey: ['avatar', saveId],
    queryFn: () => api.getAvatar(saveId),
  });

  const legacy = legacyQuery.data;
  const seasons = statsQuery.data ?? [];

  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const cardData = legacy
    ? buildCareerCardData({
        legacy,
        seasons,
        timeline: timelineQuery.data ?? [],
        avatarDataUrl: avatarQuery.data?.avatarDataUrl ?? null,
      })
    : null;

  const makeCard = async () => {
    if (!cardData) return;
    setRendering(true);
    setCardError(null);
    try {
      setCardUrl(await renderCareerCard(cardData));
    } catch {
      setCardError('Non è stato possibile generare l’immagine su questo device.');
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>📈 La tua carriera</strong>
      </div>

      {legacy && (
        <section
          className={`card legacy-card ${legacy.isRetired ? 'legacy-retired' : ''}`}
        >
          {legacy.isRetired && (
            <p className="legacy-ceremony">
              🏛 Il sipario è calato: ecco cosa lasci al calcio.
            </p>
          )}
          <div className="legacy-grade">
            <span className="legacy-grade-icon">
              {GRADE_ICON[legacy.grade.key] ?? '📈'}
            </span>
            <div>
              <h2>
                {legacy.playerName} · {legacy.grade.label}
              </h2>
              <p className="legacy-grade-desc">{legacy.grade.description}</p>
            </div>
          </div>
          <div className="legacy-totals">
            <div className="legacy-stat">
              <span className="legacy-num">{legacy.totals.appearances}</span>
              <span className="legacy-label">Presenze</span>
            </div>
            <div className="legacy-stat">
              <span className="legacy-num">{legacy.totals.goals}</span>
              <span className="legacy-label">Gol</span>
            </div>
            <div className="legacy-stat">
              <span className="legacy-num">{legacy.totals.assists}</span>
              <span className="legacy-label">Assist</span>
            </div>
            <div className="legacy-stat">
              <span className="legacy-num">
                {legacy.totals.averageRating.toFixed(2)}
              </span>
              <span className="legacy-label">Media voto</span>
            </div>
            <div className="legacy-stat">
              <span className="legacy-num">{legacy.totals.trophies}</span>
              <span className="legacy-label">Trofei</span>
            </div>
            <div className="legacy-stat">
              <span className="legacy-num">{legacy.totals.personalAwards}</span>
              <span className="legacy-label">Premi</span>
            </div>
          </div>
          {legacy.bestSeason && (
            <p className="legacy-best">
              Miglior stagione: <strong>{legacy.bestSeason.seasonLabel}</strong>{' '}
              con {legacy.bestSeason.clubName} — {legacy.bestSeason.goals} gol
              in {legacy.bestSeason.appearances} presenze (media{' '}
              {legacy.bestSeason.averageRating.toFixed(2)}).
            </p>
          )}
        </section>
      )}

      {cardData && (
        <section className="card career-card-export">
          <h2>🖼 Card della carriera</h2>
          <p className="shop-intro">
            Un&apos;immagine sola con tutto quello che hai fatto: generala e
            salvala, è pronta da mandare a chi vuoi.
          </p>
          <div className="career-card-actions">
            <button type="button" disabled={rendering} onClick={makeCard}>
              {cardUrl ? 'Rigenera la card' : 'Genera la card'}
            </button>
            {cardUrl && (
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  downloadDataUrl(
                    cardUrl,
                    careerCardFileName(cardData.playerName),
                  )
                }
              >
                ⬇ Scarica PNG
              </button>
            )}
          </div>
          {cardError && <p className="empty">{cardError}</p>}
          {cardUrl && (
            <img
              className="career-card-preview"
              src={cardUrl}
              alt={`Card della carriera di ${cardData.playerName}`}
            />
          )}
        </section>
      )}

      <section className="card">
        <h2>Stagione per stagione</h2>
        {statsQuery.isLoading && <p className="empty">Caricamento…</p>}
        {!statsQuery.isLoading && seasons.length === 0 && (
          <p className="empty">
            Nessuna presenza registrata: scendi in campo e la tua storia
            comincerà.
          </p>
        )}
        {seasons.length > 0 && (
          <div className="season-stats-wrap">
            <table className="season-stats">
              <thead>
                <tr>
                  <th>Stagione</th>
                  <th>Squadra</th>
                  <th>Pres</th>
                  <th>Gol</th>
                  <th>Assist</th>
                  <th>🟨</th>
                  <th>🟥</th>
                  <th>Media</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((row) => (
                  <tr key={`${row.seasonLabel}-${row.competitionName}`}>
                    <td>
                      {row.seasonLabel}
                      <span className="season-comp"> {row.competitionName}</span>
                    </td>
                    <td>{row.clubName}</td>
                    <td>{row.appearances}</td>
                    <td>{row.goals}</td>
                    <td>{row.assists}</td>
                    <td>{row.yellowCards}</td>
                    <td>{row.redCards}</td>
                    <td>
                      <span
                        className={
                          row.averageRating >= 7
                            ? 'chip tone-good'
                            : row.averageRating >= 6
                              ? 'chip tone-warn'
                              : 'chip tone-bad'
                        }
                      >
                        {row.averageRating.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
