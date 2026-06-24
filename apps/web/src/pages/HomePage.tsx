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

export function HomePage() {
  const queryClient = useQueryClient();
  const selectSave = useGameStore((s) => s.selectSave);

  const savesQuery = useQuery({ queryKey: ['saves'], queryFn: api.listSaves });

  const [name, setName] = useState('My Career');
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
        <h2>New career</h2>
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
            Save name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            First name
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label>
            Last name
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label>
            Nationality
            <select
              value={nationalityId}
              onChange={(e) => setNationalityId(e.target.value)}
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Position
            <select
              value={primaryPosition}
              onChange={(e) => setPrimaryPosition(e.target.value)}
            >
              {Object.values(PlayerPosition).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preferred foot
            <select
              value={preferredFoot}
              onChange={(e) => setPreferredFoot(e.target.value)}
            >
              {Object.values(PreferredFoot).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Start career'}
          </button>
          {createMutation.isError && (
            <p className="error">Could not create the career. Try again.</p>
          )}
        </form>
      </section>

      <section className="card">
        <h2>Continue</h2>
        {savesQuery.isLoading && <p>Loading…</p>}
        {savesQuery.isError && <p className="error">Could not load saves.</p>}
        {savesQuery.data && (
          <SavesList saves={savesQuery.data} onSelect={selectSave} />
        )}
      </section>
    </div>
  );
}
