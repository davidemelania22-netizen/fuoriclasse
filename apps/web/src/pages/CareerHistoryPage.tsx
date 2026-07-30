import { useQuery } from '@tanstack/react-query';
import { api, type CareerTimelineEventType } from '../api/client';
import { useGameStore } from '../stores/useGameStore';

interface CareerHistoryPageProps {
  saveId: string;
}

const EVENT_ICON: Record<CareerTimelineEventType, string> = {
  DEBUT: '🌱',
  FIRST_GOAL: '⚽',
  APPEARANCE_MILESTONE: '🎽',
  GOAL_MILESTONE: '🎯',
  TRANSFER: '✍️',
  TROPHY: '🏆',
  AWARD: '🥇',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function CareerHistoryPage({ saveId }: CareerHistoryPageProps) {
  const close = useGameStore((s) => s.closeOverlay);

  const query = useQuery({
    queryKey: ['career-timeline', saveId],
    queryFn: () => api.getCareerTimeline(saveId),
  });

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>Storia della carriera</strong>
      </div>

      <section className="card">
        <h2>I momenti che contano</h2>
        {query.isLoading && <p className="empty">Caricamento…</p>}
        {query.data && query.data.length === 0 && (
          <p className="empty">
            La tua storia comincia adesso: nessun momento ancora da
            raccontare.
          </p>
        )}
        <ol className="timeline-list">
          {query.data?.map((event, i) => (
            <li key={i} className="timeline-row">
              <span className="timeline-icon">{EVENT_ICON[event.type]}</span>
              <div className="timeline-body">
                <div className="timeline-head">
                  <strong>{event.title}</strong>
                  <span className="timeline-date">
                    {formatDate(event.date)}
                  </span>
                </div>
                <p className="timeline-desc">{event.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
