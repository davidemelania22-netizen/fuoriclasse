import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COUNTRY_CODES,
  PlayerPosition,
  PreferredFoot,
  type NewGameInput,
} from '@football-life/shared';
import { api } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { SavesList } from '../components/SavesList';
import { countryLabels, footLabels, label, positionLabels } from '../i18n';

export function HomePage() {
  const queryClient = useQueryClient();
  const selectSave = useGameStore((s) => s.selectSave);

  const savesQuery = useQuery({ queryKey: ['saves'], queryFn: api.listSaves });

  const [name, setName] = useState('La mia carriera');
  const [firstName, setFirstName] = useState('Alex');
  const [lastName, setLastName] = useState('Rossi');
  const [nationalityId, setNationalityId] = useState<string>('IT');
  const [primaryPosition, setPrimaryPosition] = useState<string>(
    PlayerPosition.Midfielder,
  );
  const [preferredFoot, setPreferredFoot] = useState<string>(
    PreferredFoot.Right,
  );

  const createMutation = useMutation({
    mutationFn: (input: NewGameInput) => api.createSave(input),
    onSuccess: async (game) => {
      await queryClient.invalidateQueries({ queryKey: ['saves'] });
      selectSave(game.save.id);
    },
  });

  return (
    <div className="page">
      <h1>Football Life</h1>

      <section className="card">
        <h2>Nuova carriera</h2>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              name,
              player: {
                firstName,
                lastName,
                nationalityId,
                primaryPosition,
                preferredFoot,
              } as NewGameInput['player'],
            });
          }}
        >
          <label>
            Nome del salvataggio
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Nome
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label>
            Cognome
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label>
            Nazionalità
            <select
              value={nationalityId}
              onChange={(e) => setNationalityId(e.target.value)}
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {label(countryLabels, code)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ruolo
            <select
              value={primaryPosition}
              onChange={(e) => setPrimaryPosition(e.target.value)}
            >
              {Object.values(PlayerPosition).map((p) => (
                <option key={p} value={p}>
                  {label(positionLabels, p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Piede preferito
            <select
              value={preferredFoot}
              onChange={(e) => setPreferredFoot(e.target.value)}
            >
              {Object.values(PreferredFoot).map((f) => (
                <option key={f} value={f}>
                  {label(footLabels, f)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creazione…' : 'Inizia carriera'}
          </button>
          {createMutation.isError && (
            <p className="error">Impossibile creare la carriera. Riprova.</p>
          )}
        </form>
      </section>

      <section className="card">
        <h2>Continua</h2>
        {savesQuery.isLoading && <p>Caricamento…</p>}
        {savesQuery.isError && (
          <p className="error">Impossibile caricare i salvataggi.</p>
        )}
        {savesQuery.data && (
          <SavesList saves={savesQuery.data} onSelect={selectSave} />
        )}
      </section>
    </div>
  );
}
