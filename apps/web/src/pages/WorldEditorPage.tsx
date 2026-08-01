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

/**
 * A world holds 22 competitions and 120 clubs: without a filter this page is
 * one 8.700px scroll, and finding the club you want to rename costs more than
 * the renaming itself. Accents are stripped so "espanola" finds "Española".
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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
  const save = () => {
    if (dirty && !mutation.isPending) mutation.mutate({ name: name.trim() });
  };
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
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button
        type="button"
        disabled={!dirty || mutation.isPending}
        onClick={save}
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
  const save = () => {
    if (!dirty || mutation.isPending) return;
    mutation.mutate({
      ...(name.trim() !== club.name ? { name: name.trim() } : {}),
      ...(shortName.trim().toUpperCase() !== club.shortName
        ? { shortName: shortName.trim().toUpperCase() }
        : {}),
    });
  };
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
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <input
        className="world-short"
        value={shortName}
        maxLength={4}
        onChange={(e) => setShortName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button
        type="button"
        disabled={!dirty || mutation.isPending}
        onClick={save}
      >
        Salva
      </button>
    </li>
  );
}

export function WorldEditorPage({ saveId }: WorldEditorPageProps) {
  const close = useGameStore((s) => s.closeOverlay);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['world', saveId],
    queryFn: () => api.getWorld(saveId),
  });
  const world = query.data;

  const needle = normalize(search.trim());
  const competitions = (world?.competitions ?? []).filter(
    (competition) =>
      !needle ||
      normalize(competition.name).includes(needle) ||
      // Continental tournaments have no country: they match on name only.
      (competition.countryId !== null &&
        normalize(label(countryLabels, competition.countryId)).includes(
          needle,
        )),
  );
  // A club matches on its own name, on its badge, on the league it plays in
  // and on its country, so "spagna" pulls up a whole league to rename.
  const clubs = (world?.clubs ?? []).filter(
    (club) =>
      !needle ||
      normalize(club.name).includes(needle) ||
      normalize(club.shortName).includes(needle) ||
      normalize(club.competitionName ?? '').includes(needle) ||
      normalize(label(countryLabels, club.countryId)).includes(needle),
  );

  const leagueGroups = new Map<string, EditableWorldClub[]>();
  for (const club of clubs) {
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
          <section className="card world-search-card">
            <input
              className="world-search"
              type="search"
              value={search}
              placeholder="Cerca un campionato o una squadra…"
              aria-label="Cerca un campionato o una squadra"
              onChange={(e) => setSearch(e.target.value)}
            />
            <p className="world-search-count">
              {needle
                ? `${competitions.length} competizioni · ${clubs.length} club`
                : `${world.competitions.length} competizioni · ${world.clubs.length} club nel tuo mondo`}
            </p>
          </section>

          {competitions.length > 0 && (
            <section className="card">
              <h2>Competizioni</h2>
              <p className="shop-intro">
                Rinomina i tornei e carica i loro badge: cambiano ovunque nel
                gioco, subito.
              </p>
              <ul className="world-list">
                {competitions.map((competition) => (
                  <CompetitionRow
                    key={competition.competitionId}
                    saveId={saveId}
                    competition={competition}
                  />
                ))}
              </ul>
            </section>
          )}

          {clubs.length > 0 && (
            <section className="card">
              <h2>Club</h2>
              <p className="shop-intro">
                Nome, sigla e stemma di ogni squadra. Clicca lo scudetto per
                caricare un logo.
              </p>
              {[...leagueGroups.entries()].map(([group, groupClubs]) => (
                <div key={group} className="world-group">
                  <h3 className="world-group-title">
                    {group}
                    <span className="world-group-country">
                      {groupClubs[0]
                        ? label(countryLabels, groupClubs[0].countryId)
                        : ''}
                    </span>
                  </h3>
                  <ul className="world-list">
                    {groupClubs.map((club) => (
                      <ClubRow key={club.clubId} saveId={saveId} club={club} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {competitions.length === 0 && clubs.length === 0 && (
            <section className="card">
              <p className="empty">Nessun risultato per «{search.trim()}».</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
