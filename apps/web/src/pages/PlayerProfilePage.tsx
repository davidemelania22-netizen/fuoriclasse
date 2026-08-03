import { useQuery } from '@tanstack/react-query';
import { api, type ProfileAttributeView } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { usePreferences } from '../stores/usePreferences';
import { attributeLabels, countryLabels, label } from '../i18n';
import {
  conditionTone,
  conditionWord,
  moraleTone,
  moraleWord,
  ratingTone,
  ratingWord,
} from '../utils/words';

interface PlayerProfilePageProps {
  saveId: string;
}

/** The three visible columns, in the order a scouting report reads them. */
const COLUMNS = [
  { category: 'TECHNICAL', title: 'Tecnica' },
  { category: 'MENTAL', title: 'Psicologia' },
  { category: 'PHYSICAL', title: 'Fisico' },
] as const;

/** Enough roles to see the shape of a player without burying the column. */
const ROLES_SHOWN = 6;

/** Where the pin sits on the pitch, per position. */
const PITCH_SPOT: Record<string, { x: number; y: number }> = {
  Portiere: { x: 8, y: 50 },
  Difensore: { x: 27, y: 50 },
  Centrocampista: { x: 50, y: 50 },
  Ala: { x: 72, y: 22 },
  'Punta (Centrale)': { x: 88, y: 50 },
};

const euro = (value: number) => `${value.toLocaleString('it-IT')} €`;

/** Compact money, the way a valuation is quoted: 79M €, 1,37M €, 820K €. */
function money(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(2).replace('.', ',')}M €`;
  }
  if (value >= 1000) return `${Math.round(value / 1000)}K €`;
  return euro(value);
}

/** Attributes read alphabetically inside their column, as on a scout sheet. */
function byLabel(rows: ProfileAttributeView[]): ProfileAttributeView[] {
  return [...rows].sort((a, b) =>
    label(attributeLabels, a.key).localeCompare(
      label(attributeLabels, b.key),
      'it',
    ),
  );
}

function Stars({ value }: { value: number }) {
  // Half stars matter: 4.5 and 5 are a different player entirely.
  return (
    <span className="pp-stars" aria-label={`${value} stelle su 5`}>
      {[1, 2, 3, 4, 5].map((slot) => {
        const fill = Math.max(0, Math.min(1, value - (slot - 1)));
        return (
          <span key={slot} className="pp-star">
            <span className="pp-star-off">★</span>
            <span className="pp-star-on" style={{ width: `${fill * 100}%` }}>
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
}

function AttributeRow({
  attribute,
  showWords,
}: {
  attribute: ProfileAttributeView;
  showWords: boolean;
}) {
  return (
    <li
      className={`pp-attr ${attribute.isKey ? 'is-key' : ''}`}
      // The longest few labels still ellipsize on a narrow window; hovering
      // gives the full name and the value.
      title={`${label(attributeLabels, attribute.key)}: ${attribute.value}/20`}
    >
      <span className="pp-attr-name">
        {label(attributeLabels, attribute.key)}
      </span>
      {showWords ? (
        <span className={`pp-attr-word ${ratingTone(attribute.value)}`}>
          {ratingWord(attribute.value)}
        </span>
      ) : (
        <span className={`pp-attr-value ${ratingTone(attribute.value)}`}>
          {attribute.value}
        </span>
      )}
    </li>
  );
}

export function PlayerProfilePage({ saveId }: PlayerProfilePageProps) {
  const close = useGameStore((s) => s.closeOverlay);
  // The numbers/words choice is a preference, not a per-visit toggle: set it
  // here or in the settings, it is the same switch either way.
  const attributeDisplay = usePreferences((s) => s.attributeDisplay);
  const setPreference = usePreferences((s) => s.set);
  const showWords = attributeDisplay === 'words';
  const query = useQuery({
    queryKey: ['player-profile', saveId],
    queryFn: () => api.getPlayerProfile(saveId),
  });
  const p = query.data;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>👤 Scheda giocatore</strong>
        <button
          type="button"
          className="ghost pp-toggle"
          onClick={() =>
            setPreference('attributeDisplay', showWords ? 'numbers' : 'words')
          }
        >
          {showWords ? '123 Numeri' : 'Aa Parole'}
        </button>
      </div>

      {query.isLoading && (
        <section className="card">
          <p className="empty">Caricamento…</p>
        </section>
      )}
      {query.isError && (
        <section className="card">
          <p className="error">Impossibile caricare la scheda.</p>
        </section>
      )}

      {p && (
        <div
          className="pp"
          style={
            {
              '--club-primary': p.colors.primary,
              '--club-secondary': p.colors.secondary,
              '--club-on-dark': p.colors.onDark,
            } as React.CSSProperties
          }
        >
          {/* Identity band */}
          <section className="pp-header card">
            <div className="pp-face">
              {p.avatarDataUrl ? (
                <img src={p.avatarDataUrl} alt="" />
              ) : (
                <span aria-hidden>👤</span>
              )}
            </div>

            <div className="pp-identity">
              <h2 className="pp-name">
                {p.playerName}
                <span className="pp-shirt">{p.shirtNumber}</span>
              </h2>
              <p className="pp-position">{p.positionLabel}</p>
              <p className="pp-origin">
                {label(countryLabels, p.nationalityId)} · {p.ageYears} anni (
                {new Date(p.birthDate).toLocaleDateString('it-IT')})
              </p>
            </div>

            <div className="pp-club">
              {p.clubLogo && <img src={p.clubLogo} alt="" />}
              <div>
                <p className="pp-club-name">{p.clubName ?? 'Svincolato'}</p>
                {p.squadRoleLabel && (
                  <p className="pp-role">{p.squadRoleLabel}</p>
                )}
              </div>
            </div>

            <dl className="pp-facts">
              <div>
                <dt>Stagione</dt>
                <dd>
                  {p.seasonLines.reduce((s, l) => s + l.appearances, 0)}{' '}
                  presenze / {p.seasonLines.reduce((s, l) => s + l.goals, 0)}{' '}
                  gol
                </dd>
              </div>
              <div>
                <dt>Valore</dt>
                <dd>{money(p.marketValue)}</dd>
              </div>
              <div>
                <dt>Ingaggio</dt>
                <dd>
                  {p.weeklyWage === null
                    ? '—'
                    : `${money(p.weeklyWage)} / sett.`}
                  {p.contractEndDate &&
                    ` · ${new Date(p.contractEndDate).toLocaleDateString('it-IT')}`}
                </dd>
              </div>
            </dl>

            <div className="pp-ability">
              <div>
                <span className="pp-ability-label">Abilità attuale</span>
                <Stars value={p.abilityStars} />
              </div>
              <div>
                <span className="pp-ability-label">Abilità potenziale</span>
                <Stars value={p.potentialStars} />
              </div>
            </div>
          </section>

          <div className="pp-body">
            {/* Roles */}
            <section className="card pp-roles">
              <h3>Ruoli</h3>
              <div className="pp-pitch">
                <span className="pp-pitch-line" />
                <span className="pp-pitch-circle" />
                <span
                  className="pp-pitch-dot"
                  style={{
                    left: `${(PITCH_SPOT[p.positionLabel] ?? { x: 50 }).x}%`,
                    top: `${(PITCH_SPOT[p.positionLabel] ?? { y: 50 }).y}%`,
                  }}
                />
              </div>
              <p className="pp-pitch-caption">{p.positionLabel}</p>
              {p.secondaryPositionLabels.length > 0 && (
                <ul className="pp-secondary">
                  {p.secondaryPositionLabels.map((role) => (
                    <li key={role}>{role}</li>
                  ))}
                </ul>
              )}

              {/* How well he plays each role, best first. Roles outside his
                  position are still listed, dimmed — that is how you spot the
                  winger who could become a full-back. */}
              <ul className="pp-role-list">
                {p.roles.slice(0, ROLES_SHOWN).map((role) => (
                  <li
                    key={role.key}
                    className={`pp-role ${role.natural ? '' : 'is-foreign'}`}
                  >
                    <Stars value={role.stars} />
                    <span className="pp-role-name">{role.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* The three attribute columns */}
            <section className="card pp-attributes">
              {COLUMNS.map((column) => {
                const rows = byLabel(
                  p.attributes.filter(
                    (a) =>
                      a.category === column.category &&
                      !(
                        column.category === 'TECHNICAL' &&
                        p.setPieceKeys.includes(a.key)
                      ),
                  ),
                );
                const setPieces =
                  column.category === 'TECHNICAL'
                    ? byLabel(
                        p.attributes.filter((a) =>
                          p.setPieceKeys.includes(a.key),
                        ),
                      )
                    : [];
                return (
                  <div key={column.category} className="pp-column">
                    <h3>{column.title}</h3>
                    <ul className="pp-attr-list">
                      {rows.map((a) => (
                        <AttributeRow
                          key={a.key}
                          attribute={a}
                          showWords={showWords}
                        />
                      ))}
                    </ul>

                    {setPieces.length > 0 && (
                      <>
                        <h4 className="pp-sub">Calci piazzati</h4>
                        <ul className="pp-attr-list">
                          {setPieces.map((a) => (
                            <AttributeRow
                              key={a.key}
                              attribute={a}
                              showWords={showWords}
                            />
                          ))}
                        </ul>
                      </>
                    )}

                    {column.category === 'PHYSICAL' && (
                      <>
                        <h4 className="pp-sub">Portiere</h4>
                        <p className="pp-keeper">
                          Valutazione come portiere{' '}
                          <strong>{p.keeperRating} / 10</strong>
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Info */}
            <section className="card pp-info">
              <h3>Info</h3>
              <dl>
                <div>
                  <dt>Altezza</dt>
                  <dd>{p.heightCm} cm</dd>
                </div>
                <div>
                  <dt>Peso</dt>
                  <dd>{p.weightKg} kg</dd>
                </div>
                <div>
                  <dt>Reputazione</dt>
                  <dd>{p.reputationLabel}</dd>
                </div>
                <div>
                  <dt>Personalità</dt>
                  <dd>{p.personalityLabel}</dd>
                </div>
              </dl>
              <div className="pp-feet">
                {(['left', 'right'] as const).map((side) => (
                  <div key={side}>
                    <span className="pp-foot-label">
                      Piede {side === 'left' ? 'sinistro' : 'destro'}
                    </span>
                    <span className="pp-foot-bars">
                      {[1, 2, 3, 4, 5].map((slot) => (
                        <i
                          key={slot}
                          className={
                            slot <= p.footStrength[side] ? 'is-on' : ''
                          }
                        />
                      ))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Earned, not assigned: each one appears the season the
                  attributes behind it get there. */}
              <h4 className="pp-sub">
                {p.traits.length}{' '}
                {p.traits.length === 1 ? 'caratteristica' : 'caratteristiche'}
              </h4>
              {p.traits.length === 0 ? (
                <p className="pp-traits-empty">
                  Nessuna ancora: si guadagnano crescendo.
                </p>
              ) : (
                <ul className="pp-traits">
                  {p.traits.map((trait) => (
                    <li key={trait.key}>{trait.label}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Condition strip */}
          <div className="pp-strip">
            <section className="card pp-tile">
              <h4>Morale</h4>
              <p className={`pp-tile-word ${moraleTone(p.morale)}`}>
                {moraleWord(p.morale)}
              </p>
            </section>
            <section className="card pp-tile">
              <h4>Forma fisica</h4>
              <p className={`pp-tile-word ${conditionTone(p.condition)}`}>
                {conditionWord(p.condition)}
              </p>
            </section>
            <section className="card pp-tile">
              <h4>Forma</h4>
              {p.recentMatches.length === 0 ? (
                <p className="empty">Nessuna partita</p>
              ) : (
                <>
                  <span className="pp-form-bars">
                    {p.recentMatches.map((m) => (
                      <i
                        key={m.date}
                        className={ratingTone(m.rating * 2)}
                        style={{ height: `${Math.max(12, m.rating * 9)}%` }}
                        title={`${m.opponentName}: ${m.rating.toFixed(1)}`}
                      />
                    ))}
                  </span>
                  <p className="pp-form-avg">
                    {(
                      p.recentMatches.reduce((s, m) => s + m.rating, 0) /
                      p.recentMatches.length
                    ).toFixed(2)}
                    <span> ult. {p.recentMatches.length} col club</span>
                  </p>
                </>
              )}
            </section>
            <section className="card pp-tile">
              <h4>Disciplina</h4>
              <p className="pp-tile-word">
                {p.seasonLines.reduce((s, l) => s + l.yellowCards, 0)} 🟨 ·{' '}
                {p.seasonLines.reduce((s, l) => s + l.redCards, 0)} 🟥
              </p>
            </section>
            <section className="card pp-tile pp-career">
              <h4>Statistiche carriera</h4>
              <p className="pp-tile-word">{p.careerTotals.clubs} squadre</p>
              <p className="pp-career-line">
                <span>{p.careerTotals.appearances} pres.</span>
                <span>{p.careerTotals.goals} gol</span>
                <span>{p.careerTotals.assists} assist</span>
              </p>
            </section>
          </div>

          {/* Season table */}
          <section className="card">
            <h3>
              Stat. stagionali{' '}
              {p.seasonLabel && (
                <span className="pp-season">{p.seasonLabel}</span>
              )}
            </h3>
            {p.seasonLines.length === 0 ? (
              <p className="empty">Nessuna presenza in questa stagione.</p>
            ) : (
              <div className="pp-table-wrap">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>Competizione</th>
                      <th>Pres.</th>
                      <th>Gol</th>
                      <th>Asst</th>
                      <th>Amm</th>
                      <th>Esp</th>
                      <th>Val. m.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.seasonLines.map((line) => (
                      <tr key={line.competitionName}>
                        <td>{line.competitionName}</td>
                        <td>{line.appearances}</td>
                        <td>{line.goals}</td>
                        <td>{line.assists}</td>
                        <td>{line.yellowCards}</td>
                        <td>{line.redCards}</td>
                        <td>
                          <span
                            className={`pp-rating ${ratingTone(line.averageRating * 2)}`}
                          >
                            {line.averageRating.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
