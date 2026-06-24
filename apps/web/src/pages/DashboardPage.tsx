import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TrainingIntensity } from '@football-life/shared';
import { api, type AdvanceResponse, type AdvanceWeekBody } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { PlayerCard } from '../components/PlayerCard';
import { EventCard } from '../components/EventCard';
import { intensityLabels, label } from '../i18n';

interface DashboardPageProps {
  saveId: string;
}

export function DashboardPage({ saveId }: DashboardPageProps) {
  const queryClient = useQueryClient();
  const clearSave = useGameStore((s) => s.clearSave);
  const openEditor = useGameStore((s) => s.openEditor);
  const [intensity, setIntensity] = useState<string>(TrainingIntensity.Normal);
  const [lastReport, setLastReport] = useState<
    AdvanceResponse['report'] | null
  >(null);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', saveId],
    queryFn: () => api.getDashboard(saveId),
  });

  const advanceMutation = useMutation({
    mutationFn: (body: AdvanceWeekBody) => api.advanceWeek(saveId, body),
    onSuccess: async (response) => {
      setLastReport(response.report);
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
    },
  });

  const chooseMutation = useMutation({
    mutationFn: ({
      eventId,
      choiceKey,
    }: {
      eventId: string;
      choiceKey: string;
    }) => api.chooseEvent(saveId, eventId, choiceKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
    },
  });

  if (dashboardQuery.isLoading) {
    return <p className="page">Caricamento carriera…</p>;
  }
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="page">
        <p className="error">Impossibile caricare questa carriera.</p>
        <button type="button" onClick={clearSave}>
          Indietro
        </button>
      </div>
    );
  }

  const { save, player, pendingEvents } = dashboardQuery.data;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={clearSave}>
          ← Salvataggi
        </button>
        <strong>{save.name}</strong>
        <button type="button" className="ghost" onClick={openEditor}>
          Modifica giocatore
        </button>
      </div>

      <PlayerCard player={player} save={save} />

      <section className="card">
        <h2>Settimana</h2>
        <div className="controls">
          <label>
            Allenamento
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
            >
              {Object.values(TrainingIntensity).map((value) => (
                <option key={value} value={value}>
                  {label(intensityLabels, value)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={advanceMutation.isPending}
            onClick={() =>
              advanceMutation.mutate({
                weeks: 1,
                intensity: intensity as never,
              })
            }
          >
            {advanceMutation.isPending ? 'Avanzamento…' : 'Avanza settimana'}
          </button>
        </div>
        {lastReport && (
          <p className="report">
            Abilità {lastReport.abilityBefore.toFixed(1)} →{' '}
            {lastReport.abilityAfter.toFixed(1)} · stanchezza{' '}
            {Math.round(lastReport.fatigue)} ·{' '}
            {lastReport.injured ? 'infortunato' : 'in forma'}
            {lastReport.injuriesSustained > 0 &&
              ` · ${lastReport.injuriesSustained} nuovo infortunio`}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Eventi</h2>
        {pendingEvents.length === 0 ? (
          <p className="empty">Nessuna decisione in sospeso.</p>
        ) : (
          <div className="events">
            {pendingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                disabled={chooseMutation.isPending}
                onChoose={(eventId, choiceKey) =>
                  chooseMutation.mutate({ eventId, choiceKey })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
