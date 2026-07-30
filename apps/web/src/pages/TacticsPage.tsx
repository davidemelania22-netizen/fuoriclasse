import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type AttackStyle,
  type Temperament,
} from '../api/client';
import { useGameStore } from '../stores/useGameStore';

interface TacticsPageProps {
  saveId: string;
}

export function TacticsPage({ saveId }: TacticsPageProps) {
  const queryClient = useQueryClient();
  const close = useGameStore((s) => s.closeOverlay);
  const [style, setStyle] = useState<AttackStyle | null>(null);
  const [temperament, setTemperament] = useState<Temperament | null>(null);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ['tactics', saveId],
    queryFn: () => api.getTactics(saveId),
  });

  useEffect(() => {
    if (query.data) {
      setStyle(query.data.instructions.style);
      setTemperament(query.data.instructions.temperament);
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.setInstructions(saveId, style as AttackStyle, temperament as Temperament),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['tactics', saveId] });
    },
  });

  const tactics = query.data;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>📋 Tattica</strong>
      </div>

      {query.isLoading && (
        <section className="card">
          <p className="empty">Caricamento…</p>
        </section>
      )}

      {query.data === null && (
        <section className="card">
          <p className="empty">
            Firma per una squadra per vedere il sistema di gioco e le
            gerarchie.
          </p>
        </section>
      )}

      {tactics && (
        <>
          <section className="card">
            <h2>
              {tactics.clubName} · {tactics.formationLabel}
            </h2>
            <p className="shop-intro">
              Le gerarchie usano lo stesso punteggio con cui il mister sceglie
              l&apos;undici: abilità, forma, condizione — e la sua fiducia in
              te. I nomi in evidenza partirebbero titolari oggi.
            </p>
          </section>

          <section className="card">
            <h2>Gerarchie di squadra</h2>
            <div className="depth-chart">
              {tactics.depthChart.map((group) => (
                <div key={group.position} className="depth-group">
                  <h3 className="depth-title">
                    {group.label}
                    <span className="depth-slots">
                      {group.slots}{' '}
                      {group.slots === 1 ? 'maglia' : 'maglie'}
                    </span>
                  </h3>
                  <ul className="depth-list">
                    {group.rows.map((row) => (
                      <li
                        key={row.rank}
                        className={[
                          'depth-row',
                          row.isProtagonist ? 'depth-you' : '',
                          row.projectedStarter ? 'depth-starter' : '',
                          row.available ? '' : 'depth-out',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="depth-rank">{row.rank}</span>
                        <span className="depth-name">
                          {row.name}
                          {row.isProtagonist && (
                            <span className="depth-badge">TU</span>
                          )}
                          {!row.available && (
                            <span className="depth-injured">🩹</span>
                          )}
                        </span>
                        <span className="depth-meta">
                          F {row.form} · C {row.condition}
                        </span>
                        <span className="depth-score">{row.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Le tue istruzioni</h2>
            <p className="shop-intro">
              Come interpreti il tuo ruolo: incide davvero su gol, assist e
              cartellini dalla prossima partita.
            </p>
            <h3 className="instructions-title">Stile offensivo</h3>
            <div className="approach-list">
              {tactics.styles.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`approach-option ${style === s.key ? '' : 'ghost'}`}
                  onClick={() => {
                    setStyle(s.key);
                    setSaved(false);
                  }}
                >
                  <span className="approach-label">{s.label}</span>
                  <span className="approach-desc">{s.description}</span>
                </button>
              ))}
            </div>
            <h3 className="instructions-title">Temperamento</h3>
            <div className="approach-list">
              {tactics.temperaments.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`approach-option ${
                    temperament === t.key ? '' : 'ghost'
                  }`}
                  onClick={() => {
                    setTemperament(t.key);
                    setSaved(false);
                  }}
                >
                  <span className="approach-label">{t.label}</span>
                  <span className="approach-desc">{t.description}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!style || !temperament || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Salvataggio…' : 'Salva istruzioni'}
            </button>
            {saved && (
              <p className="moment-saved">
                ✅ Istruzioni salvate: valgono dalla prossima partita.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
