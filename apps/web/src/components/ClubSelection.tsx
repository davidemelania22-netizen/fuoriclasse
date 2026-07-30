import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ClubDirectoryEntry } from '../api/client';
import { countryLabels, label } from '../i18n';

interface ClubSelectionProps {
  saveId: string;
}

function strengthTone(strength: number): string {
  if (strength >= 75) return '#22c55e';
  if (strength >= 55) return '#84cc16';
  if (strength >= 40) return '#eab308';
  return '#f59e0b';
}

/** Shown when the protagonist has no club: pick a starting team and sign. */
export function ClubSelection({ saveId }: ClubSelectionProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const clubsQuery = useQuery({
    queryKey: ['clubs', saveId],
    queryFn: () => api.listClubs(saveId),
  });

  const signMutation = useMutation({
    mutationFn: (clubId: string) => api.signWithClub(saveId, clubId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['finance', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['clubs', saveId] });
    },
  });

  const groups = useMemo(() => {
    const clubs = clubsQuery.data ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? clubs.filter((c) => c.name.toLowerCase().includes(term))
      : clubs;
    const byLeague = new Map<string, ClubDirectoryEntry[]>();
    for (const club of filtered) {
      const key = club.competitionName ?? 'Svincolati';
      const list = byLeague.get(key) ?? [];
      list.push(club);
      byLeague.set(key, list);
    }
    return [...byLeague.entries()];
  }, [clubsQuery.data, search]);

  return (
    <section className="card club-selection" aria-label="Scegli la tua squadra">
      <h2>Scegli la tua squadra</h2>
      <p className="club-intro">
        Firma il tuo primo contratto. Un club più forte offre uno stipendio
        migliore, ma più concorrenza per un posto da titolare.
      </p>

      <input
        className="club-search"
        placeholder="Cerca una squadra…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {clubsQuery.isLoading && <p className="empty">Caricamento squadre…</p>}
      {clubsQuery.isError && (
        <p className="error">Impossibile caricare le squadre.</p>
      )}
      {clubsQuery.data && groups.length === 0 && (
        <p className="empty">Nessuna squadra trovata.</p>
      )}

      <div className="club-groups">
        {groups.map(([league, clubs]) => (
          <div key={league} className="club-group">
            <h3 className="club-league">{league}</h3>
            <ul className="club-list">
              {clubs.map((club) => (
                <li key={club.clubId} className="club-row">
                  <div className="club-info">
                    <strong>
                      {club.logo && (
                        <img className="club-logo" src={club.logo} alt="" />
                      )}
                      {club.name}
                    </strong>
                    <span className="club-tags">
                      <span className="chip">
                        {label(countryLabels, club.countryId)}
                      </span>
                      <span className="club-rep">
                        Reputazione {club.reputation}
                      </span>
                    </span>
                  </div>
                  <span
                    className="club-strength"
                    style={{ color: strengthTone(club.strength) }}
                    title="Forza della squadra"
                  >
                    {club.strength}
                  </span>
                  <button
                    type="button"
                    disabled={signMutation.isPending}
                    onClick={() => signMutation.mutate(club.clubId)}
                  >
                    {signMutation.isPending &&
                    signMutation.variables === club.clubId
                      ? 'Firma…'
                      : 'Firma'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {signMutation.isError && (
        <p className="error">Impossibile firmare con questa squadra.</p>
      )}
    </section>
  );
}
