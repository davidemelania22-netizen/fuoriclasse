import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useGameStore } from '../stores/useGameStore';

interface NewsPageProps {
  saveId: string;
}

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  TRANSFER: { icon: '🔁', label: 'Mercato' },
  SEASON: { icon: '📅', label: 'Stagione' },
  PROTAGONIST: { icon: '⭐', label: 'Tu' },
  SACKING: { icon: '🪑', label: 'Panchine' },
  SCOUT: { icon: '🔭', label: 'Osservatori' },
  YOUTH: { icon: '🌱', label: 'Vivaio' },
  NATIONAL: { icon: '🏅', label: 'Nazionale' },
};

export function NewsPage({ saveId }: NewsPageProps) {
  const queryClient = useQueryClient();
  const close = useGameStore((s) => s.closeOverlay);

  const query = useQuery({
    queryKey: ['news', saveId],
    queryFn: () => api.getNews(saveId),
  });

  const markRead = useMutation({
    mutationFn: () => api.markNewsRead(saveId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['news', saveId] });
    },
  });

  // Opening the inbox clears the unread badge once, if there's anything unread.
  const unread = query.data?.unread ?? 0;
  useEffect(() => {
    if (unread > 0 && !markRead.isPending) markRead.mutate();
  }, [unread]);

  const items = query.data?.items ?? [];

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>📰 Notizie dal mondo</strong>
      </div>

      <section className="card">
        {query.isLoading && <p className="empty">Caricamento…</p>}
        {!query.isLoading && items.length === 0 && (
          <p className="empty">
            Nessuna notizia per ora. Avanza le settimane: il mondo del calcio si
            muoverà.
          </p>
        )}
        <ul className="news-list">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] ?? {
              icon: '📰',
              label: 'Notizia',
            };
            return (
              <li
                key={item.id}
                className={`news-item news-${item.category.toLowerCase()}`}
              >
                <span className="news-icon">{meta.icon}</span>
                <div className="news-body">
                  <div className="news-head">
                    <span className="news-headline">{item.headline}</span>
                    <span className="news-date">
                      {item.gameDate.slice(0, 10)}
                    </span>
                  </div>
                  <p className="news-text">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
