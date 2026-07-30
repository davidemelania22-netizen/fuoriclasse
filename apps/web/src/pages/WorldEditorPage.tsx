import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type EditableWorldClub,
  type EditableWorldCompetition,
} from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { countryLabels, label } from '../i18n';
import { fileToLogoDataUrl } from '../utils/image';

interface WorldEditorPageProps {
  saveId: string;
}

/** Queries whose payloads carry club/competition names or logos. */
const AFFECTED_QUERIES = [
  'world',
  'standings',
  'clubs',
  'dashboard',
  'tactics',
  'calendar',
  'next-fixture',
  'cups',
  'saves',
];

function LogoBadge({
  logo,
  alt,
  onPick,
  busy,
}: {
  logo: string | null;
  alt: string;
  onPick: (file: File) => void;
  busy: boolean;
}) {
  return (
    <label className="logo-badge" title="Carica logo">
      {logo ? (
        <img src={logo} alt={alt} />
      ) : (
        <span aria-hidden>{busy ? '…' : '🛡️'}</span>
      )}
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function CompetitionRow({
  saveId,
  competition,
}: {
  saveId: string;
  competition: EditableWorldCompetition;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(competition.name);
  useEffect(() => setName(competition.name), [competition.name]);

  const mutation = useMutation({
    mutationFn: (edit: { name?: string; logo?: string | null }) =>
      api.editWorldCompetition(saveId, competition.competitionId, edit),
    onSuccess: async () => {
      await Promise.all(
        AFFECTED_QUERIES.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });

  const dirty = name.trim() !== competition.name && name.trim().length > 0;
  return (
    <li className="world-row">
      <LogoBadge
        logo={competition.logo}
        alt={competition.name}
        busy={mutation.isPending}
        onPick={(file) =>
          void fileToLogoDataUrl(file).then((logo) => mutation.mutate({ logo }))
        }
      />
      <input
        className="world-name"
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        disabled={!dirty || mutation.isPending}
        onClick={() => mutation.mutate({ name: name.trim() })}
      >
        Salva
      </button>
    </li>
  );
}

function ClubRow({
  saveId,
  club,
}: {
  saveId: string;
  club: EditableWorldClub;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(club.name);
  const [shortName, setShortName] = useState(club.shortName);
  useEffect(() => {
    setName(club.name);
    setShortName(club.shortName);
  }, [club.name, club.shortName]);

  const mutation = useMutation({
    mutationFn: (edit: {
      name?: string;
      shortName?: string;
      logo?: string | null;
    }) => api.editWorldClub(saveId, club.clubId, edit),
    onSuccess: async () => {
      await Promise.all(
        AFFECTED_QUERIES.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });

  const dirty =
    (name.trim() !== club.name && name.trim().length > 0) ||
    (shortName.trim().toUpperCase() !== club.shortName &&
      shortName.trim().length >= 2);
  return (
    <li className="world-row">
      <LogoBadge
        logo={club.logo}
        alt={club.name}
        busy={mutation.isPending}
        onPick={(file) =>
          void fileToLogoDataUrl(file).then((logo) => mutation.mutate({ logo }))
        }
      />
      <input
        className="world-name"
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="world-short"
        value={shortName}
        maxLength={4}
        onChange={(e) => setShortName(e.target.value)}
      />
      <button
        type="button"
        disabled={!dirty || mutation.isPending}
        onClick={() =>
          mutation.mutate({
            ...(name.trim() !== club.name ? { name: name.trim() } : {}),
            ...(shortName.trim().toUpperCase() !== club.shortName
              ? { shortName: shortName.trim().toUpperCase() }
              : {}),
          })
        }
      >
        Salva
      </button>
    </li>
  );
}

export function WorldEditorPage({ saveId }: WorldEditorPageProps) {
  const close = useGameStore((s) => s.closeOverlay);
  const query = useQuery({
    queryKey: ['world', saveId],
    queryFn: () => api.getWorld(saveId),
  });
  const world = query.data;

  const leagueGroups = new Map<string, EditableWorldClub[]>();
  for (const club of world?.clubs ?? []) {
    const group = club.competitionName ?? 'Senza campionato';
    const list = leagueGroups.get(group);
    if (list) list.push(club);
    else leagueGroups.set(group, [club]);
  }

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>🏟️ Il tuo mondo</strong>
      </div>

      {query.isLoading && (
        <section className="card">
          <p className="empty">Caricamento…</p>
        </section>
      )}
      {query.isError && (
        <section className="card">
          <p className="error">Impossibile caricare il mondo.</p>
        </section>
      )}

      {world && (
        <>
          <section className="card">
            <h2>Competizioni</h2>
            <p className="shop-intro">
              Rinomina i tornei e carica i loro badge: cambiano ovunque nel
              gioco, subito.
            </p>
            <ul className="world-list">
              {world.competitions.map((competition) => (
                <CompetitionRow
                  key={competition.competitionId}
                  saveId={saveId}
                  competition={competition}
                />
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>Club</h2>
            <p className="shop-intro">
              Nome, sigla e stemma di ogni squadra. Clicca lo scudetto per
              caricare un logo.
            </p>
            {[...leagueGroups.entries()].map(([group, clubs]) => (
              <div key={group} className="world-group">
                <h3 className="world-group-title">
                  {group}
                  <span className="world-group-country">
                    {clubs[0] ? label(countryLabels, clubs[0].countryId) : ''}
                  </span>
                </h3>
                <ul className="world-list">
                  {clubs.map((club) => (
                    <ClubRow key={club.clubId} saveId={saveId} club={club} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
