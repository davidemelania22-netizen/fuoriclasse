import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EditablePlayer, PlayerEditInput } from '@football-life/shared';
import { api } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import {
  attributeCategoryLabels,
  attributeLabels,
  careerStatusLabels,
  label,
} from '../i18n';
import { from20, to20 } from '../utils/scale';

/** Fields shown on the Football-Manager-style 0-20 scale. */
const RATING_FIELDS = new Set(['currentAbility', 'potentialAbility']);

interface EditorPageProps {
  saveId: string;
}

const STAT_FIELDS = [
  ['currentAbility', 'Abilità attuale'],
  ['potentialAbility', 'Potenziale'],
  ['condition', 'Condizione'],
  ['fatigue', 'Stanchezza'],
  ['morale', 'Morale'],
  ['form', 'Forma'],
  ['stress', 'Stress'],
  ['motivation', 'Motivazione'],
  ['reputation', 'Reputazione'],
  ['popularity', 'Popolarità'],
  ['marketValue', 'Valore di mercato'],
] as const;

type StatKey = (typeof STAT_FIELDS)[number][0];

const CAREER_STATUSES = ['YOUTH', 'ACTIVE', 'INJURED', 'RETIRED', 'UNEMPLOYED'];

function EditorForm({
  saveId,
  player,
}: {
  saveId: string;
  player: EditablePlayer;
}) {
  const queryClient = useQueryClient();
  const closeEditor = useGameStore((s) => s.closeOverlay);

  const [stats, setStats] = useState<Record<StatKey, number>>(() => ({
    currentAbility: player.currentAbility,
    potentialAbility: player.potentialAbility,
    condition: player.condition,
    fatigue: player.fatigue,
    morale: player.morale,
    form: player.form,
    stress: player.stress,
    motivation: player.motivation,
    reputation: player.reputation,
    popularity: player.popularity,
    marketValue: player.marketValue,
  }));
  const [careerStatus, setCareerStatus] = useState(player.careerStatus);
  const [attrs, setAttrs] = useState<Record<string, number>>(() =>
    Object.fromEntries(player.attributes.map((a) => [a.key, a.value])),
  );

  const mutation = useMutation({
    mutationFn: (edits: PlayerEditInput) => api.editPlayer(saveId, edits),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
      await queryClient.invalidateQueries({
        queryKey: ['editable-player', saveId],
      });
      closeEditor();
    },
  });

  const categories = [...new Set(player.attributes.map((a) => a.category))];

  const maxAllRatings = () => {
    setStats((prev) => ({
      ...prev,
      currentAbility: from20(20),
      potentialAbility: from20(20),
    }));
    setAttrs(
      Object.fromEntries(player.attributes.map((a) => [a.key, from20(20)])),
    );
  };

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({
          ...stats,
          careerStatus: careerStatus as PlayerEditInput['careerStatus'],
          attributes: player.attributes.map((a) => ({
            key: a.key,
            value: attrs[a.key] ?? a.value,
          })),
        });
      }}
    >
      <section className="card">
        <div className="card-head">
          <h2>
            Modifica di {player.firstName} {player.lastName}
          </h2>
          <button type="button" className="ghost" onClick={maxAllRatings}>
            Tutti 20
          </button>
        </div>
        <div className="grid">
          {STAT_FIELDS.map(([key, text]) => {
            const rating = RATING_FIELDS.has(key);
            return (
              <label key={key}>
                {text}
                {rating ? ' (0-20)' : ''}
                <input
                  type="number"
                  min={rating ? 0 : undefined}
                  max={rating ? 20 : undefined}
                  value={rating ? to20(stats[key]) : stats[key]}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    setStats((prev) => ({
                      ...prev,
                      [key]: rating ? from20(raw) : raw,
                    }));
                  }}
                />
              </label>
            );
          })}
          <label>
            Stato di carriera
            <select
              value={careerStatus}
              onChange={(e) => setCareerStatus(e.target.value)}
            >
              {CAREER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {label(careerStatusLabels, value)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {categories.map((category) => (
        <section className="card" key={category}>
          <h3>{label(attributeCategoryLabels, category)} (0-20)</h3>
          <div className="grid">
            {player.attributes
              .filter((a) => a.category === category)
              .map((a) => (
                <label key={a.key}>
                  {label(attributeLabels, a.key)}
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={to20(attrs[a.key] ?? a.value)}
                    onChange={(e) =>
                      setAttrs((prev) => ({
                        ...prev,
                        [a.key]: from20(Number(e.target.value)),
                      }))
                    }
                  />
                </label>
              ))}
          </div>
        </section>
      ))}

      <div className="controls">
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        <button type="button" onClick={closeEditor}>
          Annulla
        </button>
        {mutation.isError && (
          <span className="error">Impossibile salvare.</span>
        )}
      </div>
    </form>
  );
}

export function EditorPage({ saveId }: EditorPageProps) {
  const closeEditor = useGameStore((s) => s.closeOverlay);
  const query = useQuery({
    queryKey: ['editable-player', saveId],
    queryFn: () => api.getEditablePlayer(saveId),
  });

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={closeEditor}>
          ← Indietro
        </button>
        <strong>Editor giocatore</strong>
      </div>
      {query.isLoading && <p>Caricamento…</p>}
      {query.isError && (
        <p className="error">Impossibile caricare il giocatore.</p>
      )}
      {query.data && <EditorForm saveId={saveId} player={query.data} />}
    </div>
  );
}
