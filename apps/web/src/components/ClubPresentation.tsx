import { useEffect, useId, useState } from 'react';
import type { ClubPresentation as Presentation } from '../api/client';

interface ClubPresentationProps {
  presentation: Presentation;
  /** Called when the scene finishes, or when the player skips it. */
  onDone: () => void;
}

/** Mirrors SquadRole in @football-life/shared, in words a player reads. */
const SQUAD_ROLE_WORDS: Record<string, string> = {
  KEY: 'giocatore chiave',
  FIRST_TEAM: 'titolare',
  ROTATION: 'uomo di rotazione',
  BACKUP: 'riserva',
  PROSPECT: 'giovane di prospettiva',
};

/** Photographers do not flash in unison; fixed offsets look staged. */
const FLASHES = [
  { top: '20%', left: '6%', delay: 1.5 },
  { top: '66%', left: '3%', delay: 2.3 },
  { top: '30%', left: '92%', delay: 1.8 },
  { top: '74%', left: '95%', delay: 2.7 },
  { top: '11%', left: '48%', delay: 2.1 },
  { top: '84%', left: '28%', delay: 3.1 },
];

/**
 * The unveiling, staged as the photograph every signing produces: the club's
 * media wall behind, the crest over one shoulder, and the new player holding
 * up the shirt with his name and number on it.
 *
 * Everything is CSS and SVG — no video, no animation library, no megabytes,
 * and no artwork per club. The wall, the shirt and the crest all take the
 * club's own colours, so the same scene is red and black at Milano Rossonera
 * and yellow and red at Lecce.
 */
export function ClubPresentation({
  presentation,
  onDone,
}: ClubPresentationProps) {
  const [leaving, setLeaving] = useState(false);
  const { colors } = presentation;
  // Staying is not arriving: same stage, same shirt, different sentence.
  const isRenewal = presentation.kind === 'RENEWAL';
  const arcId = useId();

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDone, 420);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Never show the raw enum: an unknown role reads better as plain words
  // than as FIRST_TEAM, which is what the first version put on screen.
  const role =
    SQUAD_ROLE_WORDS[presentation.squadRole] ??
    presentation.squadRole.toLowerCase().replace(/_/g, ' ');

  return (
    <div
      className={`presentation ${leaving ? 'is-leaving' : ''}`}
      style={
        {
          '--club-primary': colors.primary,
          '--club-secondary': colors.secondary,
          '--club-on-primary': colors.onPrimary,
          '--club-on-dark': colors.onDark,
        } as React.CSSProperties
      }
      role="dialog"
      aria-label={`Presentazione al ${presentation.clubName}`}
    >
      {/* The media wall: colour blocks and a sweep, like the backdrop clubs
          put up in the press room. */}
      <div className="wall" aria-hidden>
        <div className="wall-block" />
        <div className="wall-sweep" />
        <div className="wall-crest">
          {presentation.clubLogo ? (
            <img src={presentation.clubLogo} alt="" />
          ) : (
            <svg viewBox="0 0 64 64" width="100%" height="100%">
              <path
                d="M32 3 58 12v22c0 14-11 24-26 27C17 58 6 48 6 34V12Z"
                fill="var(--club-primary)"
                stroke="var(--club-secondary)"
                strokeWidth="2.5"
              />
              <path
                d="M32 15v32M20 24h24"
                stroke="var(--club-secondary)"
                strokeWidth="3.5"
                fill="none"
              />
            </svg>
          )}
        </div>
        {FLASHES.map((flash, i) => (
          <span
            key={i}
            className="presentation-flash"
            style={{
              top: flash.top,
              left: flash.left,
              animationDelay: `${flash.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="unveil">
        {/* Head above, shirt in front: the pose of every signing photo. */}
        <div className="unveil-player">
          {/* Only with a real photo: the placeholder silhouette behind the
              collar read as a hole in the wall, and the shirt alone is the
              stronger image anyway. */}
          {presentation.avatarDataUrl && (
            <div className="unveil-head">
              <img src={presentation.avatarDataUrl} alt="" />
            </div>
          )}

          <div className="unveil-shirt">
            <svg viewBox="0 0 200 210" width="100%" height="100%">
              <defs>
                {/* The arc the surname follows, as it does on a real back. */}
                <path id={arcId} d="M42 92 Q100 62 158 92" fill="none" />
              </defs>
              <path
                className="shirt-body"
                d="M70 24 L96 14 Q100 30 104 14 L130 24 L188 60 L162 96 L148 84 L148 190 Q100 200 52 190 L52 84 L38 96 L12 60 Z"
                fill="var(--club-primary)"
                stroke="var(--club-secondary)"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              {/* Collar and sleeve trim in the second colour. */}
              <path
                d="M96 14 Q100 32 104 14"
                fill="none"
                stroke="var(--club-secondary)"
                strokeWidth="7"
              />
              <path
                d="M162 96 L148 84M38 96 L52 84"
                stroke="var(--club-secondary)"
                strokeWidth="6"
              />
              <text className="shirt-name" fill="var(--club-on-primary)">
                <textPath href={`#${arcId}`} startOffset="50%">
                  {presentation.shirtName}
                </textPath>
              </text>
              <text
                className="shirt-number"
                x="100"
                y="166"
                textAnchor="middle"
                fill="var(--club-on-primary)"
              >
                {presentation.shirtNumber}
              </text>
            </svg>
          </div>
        </div>

        <div className="unveil-copy">
          <p className="presentation-kicker">
            {isRenewal
              ? 'Rinnovo'
              : (presentation.competitionName ?? 'Nuova avventura')}{' '}
            · {presentation.year}
          </p>
          <h2 className="presentation-name">{presentation.playerName}</h2>
          <p className="presentation-club">
            {isRenewal
              ? 'ha firmato il rinnovo con il'
              : 'è un nuovo giocatore del'}
          </p>
          <p className="presentation-club-name">{presentation.clubName}</p>
          {isRenewal && (
            <p className="presentation-until">
              Resta fino al {presentation.year + presentation.contractYears}
            </p>
          )}
          <dl className="presentation-terms">
            <div>
              <dt>Contratto</dt>
              <dd>
                {presentation.contractYears}{' '}
                {presentation.contractYears === 1 ? 'anno' : 'anni'}
              </dd>
            </div>
            <div>
              <dt>Ingaggio</dt>
              <dd>
                {presentation.weeklyWage.toLocaleString('it-IT')} € / sett.
              </dd>
            </div>
            <div>
              <dt>Ruolo in rosa</dt>
              <dd>{role}</dd>
            </div>
          </dl>
        </div>
      </div>

      <button type="button" className="presentation-skip" onClick={finish}>
        Continua →
      </button>
    </div>
  );
}
