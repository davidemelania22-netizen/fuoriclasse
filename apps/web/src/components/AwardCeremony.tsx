import { useEffect, useState } from 'react';
import type { AwardCeremony as Ceremony } from '../api/client';
import { Trophy } from './trophy-art';

interface AwardCeremonyProps {
  ceremony: Ceremony;
  /** Called when the scene finishes, or when the player skips it. */
  onDone: () => void;
}

/**
 * Confetti costs nothing when it is thirty absolutely positioned squares.
 * Fixed values rather than random ones so the fall looks choreographed and
 * is identical every time a scene is replayed.
 */
const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 10) * 0.22}s`,
  duration: `${2.6 + ((i * 7) % 12) / 10}s`,
  drift: `${((i % 5) - 2) * 26}px`,
  spin: `${((i % 4) + 1) * 240}deg`,
  size: 6 + (i % 3) * 3,
}));

/**
 * The night a trophy is lifted: the stage is dark, one beam finds the cup,
 * it rises, the confetti falls, and the name is read out.
 *
 * Shares the presentation's stage, lighting and skip affordances — only the
 * trophy and the confetti are new.
 */
export function AwardCeremony({ ceremony, onDone }: AwardCeremonyProps) {
  const [leaving, setLeaving] = useState(false);
  const { colors } = ceremony;
  const metal = ceremony.isPersonal ? '#f0cf67' : '#d9dee8';
  const confettiColors = [colors.onDark, metal, '#ffffff'];

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

  return (
    <div
      className={`presentation ceremony ${leaving ? 'is-leaving' : ''}`}
      style={
        {
          '--club-primary': colors.primary,
          '--club-secondary': colors.secondary,
          '--club-on-dark': colors.onDark,
          // Trophies are metal, not club-coloured: taking the metal from
          // the club made a maroon-and-white side lift a flat white cup.
          // The club still owns the stage, the beam and its own name.
          '--trophy-metal': metal,
          '--trophy-edge': ceremony.isPersonal ? '#8a6a12' : '#7d8698',
        } as React.CSSProperties
      }
      role="dialog"
      aria-label={`Premiazione: ${ceremony.label}`}
    >
      <div className="ceremony-confetti" aria-hidden>
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            style={{
              left: piece.left,
              width: piece.size,
              height: piece.size,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              // Two custom properties the keyframes read, so every piece
              // falls on its own path without thirty sets of keyframes.
              ['--drift' as string]: piece.drift,
              ['--spin' as string]: piece.spin,
              // Never the club's primary: a maroon side rained maroon
              // paper onto a maroon stage and nothing was visible at all.
              // These three all read against a dark background by
              // construction — the lifted club colour, the trophy's metal,
              // and plain white.
              background: confettiColors[i % 3],
            }}
          />
        ))}
      </div>

      <div className="presentation-stage ceremony-stage">
        <div className="presentation-beam" aria-hidden />

        <div className="ceremony-trophy">
          <Trophy type={ceremony.type} />
        </div>

        <div className="presentation-copy">
          <p className="presentation-kicker">
            {ceremony.seasonLabel}
            {ceremony.competitionName ? ` · ${ceremony.competitionName}` : ''}
          </p>
          <h2 className="presentation-name ceremony-label">{ceremony.label}</h2>
          <p className="presentation-club">
            {ceremony.isPersonal ? 'Il premio va a' : 'Alza il trofeo con il'}
          </p>
          <p className="presentation-club-name">
            {ceremony.isPersonal
              ? ceremony.playerName
              : (ceremony.clubName ?? ceremony.playerName)}
          </p>

          {!ceremony.isPersonal && (
            <p className="ceremony-player">{ceremony.playerName}</p>
          )}

          <p className="ceremony-total">
            {ceremony.careerTotal === 1
              ? 'Il primo trofeo della carriera.'
              : `${ceremony.careerTotal}° trofeo in carriera.`}
          </p>
        </div>
      </div>

      <button type="button" className="presentation-skip" onClick={finish}>
        Continua →
      </button>
    </div>
  );
}
