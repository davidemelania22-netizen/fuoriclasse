import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type InterviewResult } from '../api/client';
import { useGameStore } from '../stores/useGameStore';

interface InterviewPageProps {
  saveId: string;
}

const toneLabels: Record<string, string> = {
  HUMBLE: 'Umile',
  BOLD: 'Sicuro',
  DIPLOMATIC: 'Diplomatico',
};

const statLabels: Record<string, string> = {
  morale: 'Morale',
  stress: 'Stress',
  happiness: 'Felicità',
  mentalHealth: 'Salute mentale',
  motivation: 'Motivazione',
  popularity: 'Popolarità',
  reputation: 'Reputazione',
};

export function InterviewPage({ saveId }: InterviewPageProps) {
  const queryClient = useQueryClient();
  const close = useGameStore((s) => s.closeOverlay);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [result, setResult] = useState<InterviewResult | null>(null);

  const query = useQuery({
    queryKey: ['interview', saveId],
    queryFn: () => api.getInterview(saveId),
  });

  const submitMutation = useMutation({
    mutationFn: (answers: { questionKey: string; answerKey: string }[]) =>
      api.submitInterview(saveId, answers),
    onSuccess: async (res) => {
      setResult(res);
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['interview', saveId] });
    },
  });

  const questions = query.data?.questions ?? [];
  const allAnswered =
    questions.length > 0 && questions.every((q) => picks[q.key]);

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>Sala stampa</strong>
      </div>

      <section className="card">
        <h2>Conferenza stampa</h2>
        <p className="shop-intro">
          Rispondi ai giornalisti. Il tono che scegli (umile, sicuro o
          diplomatico) sposta popolarità, morale e reputazione. Una sola
          intervista a settimana.
        </p>

        {query.isLoading && <p className="empty">Caricamento…</p>}
        {query.data && !query.data.available && !result && (
          <p className="empty">
            Hai già parlato con la stampa questa settimana. Avanza di una
            settimana per una nuova conferenza.
          </p>
        )}

        {query.data?.available &&
          questions.map((q) => (
            <div key={q.key} className="interview-q">
              <p className="interview-prompt">
                {q.fromNews && (
                  <span className="interview-news-tag">📰 Dalle notizie</span>
                )}
                {q.prompt}
              </p>
              <div className="interview-answers">
                {q.answers.map((a) => {
                  const selected = picks[q.key] === a.key;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      className={`interview-answer ${selected ? '' : 'ghost'}`}
                      onClick={() =>
                        setPicks((p) => ({ ...p, [q.key]: a.key }))
                      }
                    >
                      <span className="interview-tone">
                        {toneLabels[a.tone] ?? a.tone}
                      </span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {query.data?.available && (
          <button
            type="button"
            disabled={!allAnswered || submitMutation.isPending}
            onClick={() =>
              submitMutation.mutate(
                questions.map((q) => ({
                  questionKey: q.key,
                  answerKey: picks[q.key] as string,
                })),
              )
            }
          >
            {submitMutation.isPending ? 'Invio…' : 'Concludi intervista'}
          </button>
        )}

        {result && (
          <div className="agent-result">
            <strong>Intervista pubblicata.</strong>{' '}
            {Object.entries(result.deltas)
              .filter(([, v]) => v !== 0)
              .map(
                ([k, v]) =>
                  `${statLabels[k] ?? k} ${v > 0 ? '+' : ''}${v}`,
              )
              .join(' · ')}
          </div>
        )}
      </section>
    </div>
  );
}
