import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MatchApproach } from '../api/client';
import { useGameStore } from '../stores/useGameStore';

interface MatchPreparePageProps {
  saveId: string;
}

export function MatchPreparePage({ saveId }: MatchPreparePageProps) {
  const queryClient = useQueryClient();
  const close = useGameStore((s) => s.closeOverlay);
  const [approach, setApproach] = useState<MatchApproach | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ['next-fixture', saveId],
    queryFn: () => api.getNextFixture(saveId),
  });

  // Seed the form from any plan already prepared for this fixture.
  useEffect(() => {
    if (query.data) {
      setApproach(query.data.plannedApproach ?? null);
      setChoices(query.data.plannedChoices ?? {});
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.saveMatchPlan(saveId, approach as MatchApproach, choices),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['next-fixture', saveId] });
    },
  });

  const fixture = query.data;
  const allMomentsChosen =
    !!fixture && fixture.moments.every((m) => choices[m.id]);
  const ready = approach !== null && allMomentsChosen;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>Prepara la partita</strong>
      </div>

      {query.isLoading && (
        <section className="card">
          <p className="empty">Caricamento…</p>
        </section>
      )}

      {query.data === null && (
        <section className="card">
          <p className="empty">
            Nessuna partita in programma. Firma per una squadra o attendi il
            prossimo turno di campionato.
          </p>
        </section>
      )}

      {fixture && (
        <>
          <section className="card">
            <h2>
              {fixture.isHome
                ? `${'La tua squadra'} vs ${fixture.opponentName}`
                : `${fixture.opponentName} vs la tua squadra`}
              {fixture.isDerby && <span className="derby-badge">DERBY</span>}
            </h2>
            <p className="shop-intro">
              {fixture.competitionName} ·{' '}
              {fixture.isHome ? 'In casa' : 'In trasferta'} ·{' '}
              {fixture.date.slice(0, 10)}
              {fixture.isDerby && (
                <>
                  {' '}
                  · <strong>È un derby: ogni episodio pesa il doppio.</strong>
                </>
              )}
            </p>
          </section>

          <section className="card">
            <h2>Approccio alla gara</h2>
            <div className="approach-list">
              {fixture.approaches.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={`approach-option ${
                    approach === a.key ? '' : 'ghost'
                  }`}
                  onClick={() => {
                    setApproach(a.key);
                    setSaved(false);
                  }}
                >
                  <span className="approach-label">{a.label}</span>
                  <span className="approach-desc">{a.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Momenti chiave</h2>
            <p className="shop-intro">
              Decidi ora come affronterai le situazioni decisive della partita.
            </p>
            {fixture.moments.map((moment) => (
              <div key={moment.id} className="moment-q">
                <p className="moment-prompt">{moment.prompt}</p>
                <div className="moment-options">
                  {moment.options.map((o) => {
                    const selected = choices[moment.id] === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        className={`moment-option ${selected ? '' : 'ghost'}`}
                        onClick={() => {
                          setChoices((c) => ({ ...c, [moment.id]: o.key }));
                          setSaved(false);
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={!ready || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Salvataggio…' : 'Conferma il piano'}
            </button>
            {saved && (
              <p className="moment-saved">
                ✅ Piano confermato. Avanza di una settimana per giocare la
                partita.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
