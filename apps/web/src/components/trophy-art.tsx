/**
 * The trophies, drawn rather than photographed.
 *
 * Five silhouettes on a 64×64 grid, one per honour the protagonist can win.
 * They take their metal from the scene's `--trophy-metal` variables, so the
 * same shape reads as gold on a personal award and as the club's colours on
 * a team trophy.
 */

interface TrophyProps {
  type: string;
}

const metal = {
  fill: 'var(--trophy-metal)',
  stroke: 'var(--trophy-edge)',
  strokeWidth: 1.6,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

/** Plinth every standing trophy rests on. */
function Base() {
  return (
    <>
      <rect x="22" y="52" width="20" height="4" rx="1.4" {...metal} />
      <rect x="17" y="56" width="30" height="6" rx="2" {...metal} />
    </>
  );
}

function LeagueCup() {
  return (
    <>
      <path d="M20 8h24v13a12 12 0 0 1-24 0Z" {...metal} />
      <path d="M20 11h-6a7 7 0 0 0 7 7" {...metal} fill="none" />
      <path d="M44 11h6a7 7 0 0 1-7 7" {...metal} fill="none" />
      <path d="M30 33h4v19h-4Z" {...metal} />
      <Base />
    </>
  );
}

/** Taller, with the long handles a continental cup is known for. */
function ContinentalCup() {
  return (
    <>
      <path d="M21 6h22v16a11 11 0 0 1-22 0Z" {...metal} />
      <path d="M21 8c-9 1-11 8-9 13 1.6 4 5 5 8 4" {...metal} fill="none" />
      <path d="M43 8c9 1 11 8 9 13-1.6 4-5 5-8 4" {...metal} fill="none" />
      <path d="M29 33h6v19h-6Z" {...metal} />
      <Base />
    </>
  );
}

/** A knockout cup: squatter bowl, wide lip. */
function NationalCup() {
  return (
    <>
      <path d="M18 10h28l-3 12a11 11 0 0 1-22 0Z" {...metal} />
      <ellipse cx="32" cy="10" rx="14" ry="3" {...metal} />
      <path d="M30 34h4v18h-4Z" {...metal} />
      <Base />
    </>
  );
}

/** The nations tournament: a globe, not a cup. */
function NationsTrophy() {
  return (
    <>
      <circle cx="32" cy="20" r="13" {...metal} />
      <path
        d="M19 20h26M32 7c5 6 5 20 0 26M32 7c-5 6-5 20 0 26"
        {...metal}
        fill="none"
      />
      <path d="M29 34h6v18h-6Z" {...metal} />
      <Base />
    </>
  );
}

/** The individual award: a ball held up on a plinth. */
function GoldenBall() {
  return (
    <>
      <circle cx="32" cy="20" r="13" {...metal} />
      <path
        d="M32 11l5 3.6-2 6h-6l-2-6Zm-13 9 5-3M45 20l-5-3M25 30l2-4M39 30l-2-4"
        {...metal}
        fill="none"
      />
      <path d="M29 34h6v18h-6Z" {...metal} />
      <Base />
    </>
  );
}

/** The scoring award: a boot. */
function GoldenBoot() {
  return (
    <>
      <path d="M14 22h13c2 6 6 9 13 10 6 1 11 4 11 10v4H14Z" {...metal} />
      <path d="M18 30h6M26 32h6M36 36h8" {...metal} fill="none" />
      <rect x="10" y="50" width="44" height="6" rx="2" {...metal} />
    </>
  );
}

const BY_TYPE: Record<string, () => JSX.Element> = {
  LEAGUE_TITLE: LeagueCup,
  NATIONAL_CUP: NationalCup,
  CONTINENTAL_CUP: ContinentalCup,
  INTERNATIONAL: NationsTrophy,
  BALLON_DOR: GoldenBall,
  GOLDEN_BOOT: GoldenBoot,
};

export function Trophy({ type }: TrophyProps) {
  const Shape = BY_TYPE[type] ?? LeagueCup;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <Shape />
    </svg>
  );
}
