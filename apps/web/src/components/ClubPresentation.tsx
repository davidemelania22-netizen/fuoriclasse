import { useEffect, useState } from 'react';
import type { ClubPresentation as Presentation } from '../api/client';

interface ClubPresentationProps {
  presentation: Presentation;
  /** Called when the scene finishes, or when the player skips it. */
  onDone: () => void;
}

const SQUAD_ROLE_WORDS: Record<string, string> = {
  STAR: 'stella della squadra',
  KEY: 'giocatore chiave',
  REGULAR: 'titolare',
  ROTATION: 'rotazione',
  PROSPECT: 'giovane di prospettiva',
  BACKUP: 'riserva',
};

/** Photographers do not flash in unison; fixed offsets look staged. */
const FLASHES = [
  { top: '18%', left: '8%', delay: 1.1 },
  { top: '62%', left: '4%', delay: 1.9 },
  { top: '28%', left: '88%', delay: 1.4 },
  { top: '72%', left: '92%', delay: 2.3 },
  { top: '9%', left: '52%', delay: 1.7 },
  { top: '80%', left: '30%', delay: 2.7 },
];

/**
 * The unveiling: lights up, crest drops, the player walks into frame while
 * the photographers go off, then the name assembles and the deal appears.
 *
 * Everything is CSS and SVG — no video, no animation library, no megabytes.
 * The club's own colours drive the whole palette, so Milano Rossonera is red
 * and black and Firenze Viola is purple without a single asset per club.
 */
export function ClubPresentation({
  presentation,
  onDone,
}: ClubPresentationProps) {
  const [leaving, setLeaving] = useState(false);
  const { colors } = presentation;

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    // Let the fade-out play before unmounting.
    window.setTimeout(onDone, 420);
  };

  // Escape skips, like any cutscene should.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const role =
    SQUAD_ROLE_WORDS[presentation.squadRole] ??
    presentation.squadRole.toLowerCase();

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
      <div className="presentation-stage">
        <div className="presentation-beam" aria-hidden />
        {FLASHES.map((flash, i) => (
          <span
            key={i}
            className="presentation-flash"
            aria-hidden
            style={{
              top: flash.top,
              left: flash.left,
              animationDelay: `${flash.delay}s`,
            }}
          />
        ))}

        <div className="presentation-crest" aria-hidden>
          {presentation.clubLogo ? (
            <img src={presentation.clubLogo} alt="" />
          ) : (
            <svg viewBox="0 0 64 64" width="100%" height="100%">
              <path
                d="M32 3 58 12v22c0 14-11 24-26 27C17 58 6 48 6 34V12Z"
                fill="var(--club-primary)"
                stroke="var(--club-secondary)"
                strokeWidth="3"
              />
              <path
                d="M32 14v34"
                stroke="var(--club-secondary)"
                strokeWidth="5"
              />
            </svg>
          )}
        </div>

        <div className="presentation-figure">
          {presentation.avatarDataUrl ? (
            <img src={presentation.avatarDataUrl} alt="" />
          ) : (
            <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
              <circle cx="50" cy="38" r="20" fill="var(--club-on-primary)" />
              <path
                d="M14 96 C14 70 32 60 50 60 C68 60 86 70 86 96 Z"
                fill="var(--club-on-primary)"
              />
            </svg>
          )}
        </div>

        <div className="presentation-copy">
          <p className="presentation-kicker">
            {presentation.competitionName ?? 'Nuova avventura'} ·{' '}
            {presentation.year}
          </p>
          <h2 className="presentation-name">{presentation.playerName}</h2>
          <p className="presentation-club">è un nuovo giocatore del</p>
          <p className="presentation-club-name">{presentation.clubName}</p>
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
