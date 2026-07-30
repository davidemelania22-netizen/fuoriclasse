import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '../stores/useGameStore';
import { api } from '../api/client';

interface LifestylePageProps {
  saveId: string;
}

export function LifestylePage({ saveId }: LifestylePageProps) {
  const queryClient = useQueryClient();
  const close = useGameStore((s) => s.closeOverlay);

  const query = useQuery({
    queryKey: ['lifestyles', saveId],
    queryFn: () => api.listLifestyles(saveId),
  });

  const chooseMutation = useMutation({
    mutationFn: (lifestyle: string) => api.chooseLifestyle(saveId, lifestyle),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lifestyles', saveId] });
    },
  });

  const current = query.data?.current ?? null;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>Stile di vita</strong>
      </div>

      <section className="card">
        <h2>Come vivi fuori dal campo</h2>
        <p className="shop-intro">
          La tua vita privata finisce sui giornali: ogni stile sblocca storie
          diverse sui media, che influenzano popolarità, morale e concentrazione.
        </p>
        {query.isLoading && <p className="empty">Caricamento…</p>}
        <ul className="lifestyle-list">
          {query.data?.lifestyles.map((l) => {
            const active = l.key === current;
            return (
              <li
                key={l.key}
                className={`lifestyle-row ${active ? 'lifestyle-current' : ''}`}
              >
                <div className="lifestyle-info">
                  <div className="lifestyle-head">
                    <strong>{l.name}</strong>
                    <span className="chip chip-accent">{l.vibe}</span>
                  </div>
                  <span className="shop-desc">{l.description}</span>
                </div>
                <button
                  type="button"
                  disabled={active || chooseMutation.isPending}
                  onClick={() => chooseMutation.mutate(l.key)}
                >
                  {active ? 'Attuale' : 'Scegli'}
                </button>
              </li>
            );
          })}
        </ul>
        {chooseMutation.isError && (
          <p className="error">Impossibile aggiornare lo stile di vita.</p>
        )}
      </section>
    </div>
  );
}
