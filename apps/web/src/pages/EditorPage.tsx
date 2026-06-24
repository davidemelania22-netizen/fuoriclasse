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
  const closeEditor = useGameStore((s) => s.closeEditor);

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
        <h2>
          Modifica di {player.firstName} {player.lastName}
        </h2>
        <div className="grid">
          {STAT_FIELDS.map(([key, text]) => (
            <label key={key}>
              {text}
              <input
                type="number"
                value={stats[key]}
                onChange={(e) =>
                  setStats((prev) => ({
                    ...prev,
                    [key]: Number(e.target.value),
                  }))
                }
              />
            </label>
          ))}
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
          <h3>{label(attributeCategoryLabels, category)}</h3>
          <div className="grid">
            {player.attributes
              .filter((a) => a.category === category)
              .map((a) => (
                <label key={a.key}>
                  {label(attributeLabels, a.key)}
                  <input
                    type="number"
                    value={attrs[a.key] ?? a.value}
                    onChange={(e) =>
                      setAttrs((prev) => ({
                        ...prev,
                        [a.key]: Number(e.target.value),
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
  const closeEditor = useGameStore((s) => s.closeEditor);
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
