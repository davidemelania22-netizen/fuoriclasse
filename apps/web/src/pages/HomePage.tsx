import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COUNTRY_CODES,
  PlayerPosition,
  PreferredFoot,
  type NewGameInput,
  type QuickStartKey,
  type SaveGameSummary,
} from '@football-life/shared';
import { api } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { SavesList } from '../components/SavesList';
import { countryLabels, footLabels, label, positionLabels } from '../i18n';

const randomSeed = () => Math.random().toString(36).slice(2, 12);

export function HomePage() {
  const queryClient = useQueryClient();
  const selectSave = useGameStore((s) => s.selectSave);

  const savesQuery = useQuery({ queryKey: ['saves'], queryFn: api.listSaves });
  const quickStartsQuery = useQuery({
    queryKey: ['quick-starts'],
    queryFn: api.listQuickStarts,
  });

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
  const [seed] = useState<string>(randomSeed);
  const [quickStart, setQuickStart] = useState<QuickStartKey>('CLASSIC');

  const createMutation = useMutation({
    mutationFn: (input: NewGameInput) => api.createSave(input),
    onSuccess: async (game) => {
      await queryClient.invalidateQueries({ queryKey: ['saves'] });
      selectSave(game.save.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSave(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saves'] });
    },
  });

  const handleDelete = (save: SaveGameSummary) => {
    if (
      window.confirm(
        `Eliminare definitivamente la carriera "${save.name}"? L'operazione non è reversibile.`,
      )
    ) {
      deleteMutation.mutate(save.id);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ⚽
          </span>
          <div>
            <h1>
              <span className="brand-top">Football</span>
              <span className="brand-bottom">Life</span>
            </h1>
            <p>Vivi la tua carriera. Scegli il tuo destino.</p>
          </div>
        </div>
      </header>

      <div className="home">
        <section className="card">
          <h2>Nuova carriera</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name,
                seed,
                quickStart,
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
            {quickStartsQuery.data && (
              <div className="qs-picker">
                <span className="qs-picker-label">Come vuoi cominciare?</span>
                <div className="qs-options">
                  {quickStartsQuery.data.map((qs) => (
                    <button
                      key={qs.key}
                      type="button"
                      className={`qs-option ${
                        quickStart === qs.key ? 'qs-selected' : ''
                      }`}
                      onClick={() => setQuickStart(qs.key)}
                    >
                      <span className="qs-head">
                        <span aria-hidden>{qs.icon}</span> {qs.label}
                        <span className="qs-age">{qs.ageYears} anni</span>
                      </span>
                      <span className="qs-desc">{qs.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              {createMutation.isPending
                ? 'Creazione del mondo…'
                : 'Inizia carriera'}
            </button>
            {createMutation.isError && (
              <p className="error">Impossibile creare la carriera. Riprova.</p>
            )}
          </form>
        </section>

        <section className="card">
          <h2>Continua</h2>
          {savesQuery.data && savesQuery.data.length > 0 && (
            <button
              type="button"
              className="resume-hero"
              onClick={() => selectSave(savesQuery.data[0]!.id)}
            >
              <span className="resume-label">
                Riprendi la carriera più recente
              </span>
              <span className="resume-name">{savesQuery.data[0]!.name}</span>
              <span className="resume-meta">
                <span>
                  Data del gioco{' '}
                  <strong>
                    {savesQuery.data[0]!.currentDate.slice(0, 10)}
                  </strong>
                </span>
                <span>
                  Ultima partita{' '}
                  <strong>
                    {savesQuery.data[0]!.lastPlayedAt.slice(0, 10)}
                  </strong>
                </span>
              </span>
              <span className="resume-cta">Riprendi »</span>
            </button>
          )}
          {savesQuery.isLoading && <p>Caricamento…</p>}
          {savesQuery.isError && (
            <p className="error">Impossibile caricare i salvataggi.</p>
          )}
          {savesQuery.data && (
            <SavesList
              saves={savesQuery.data}
              onSelect={selectSave}
              onDelete={handleDelete}
              deletingId={
                deleteMutation.isPending
                  ? (deleteMutation.variables ?? null)
                  : null
              }
            />
          )}
          {deleteMutation.isError && (
            <p className="error">Impossibile eliminare il salvataggio.</p>
          )}
        </section>
      </div>
    </div>
  );
}
