interface AbilityRingProps {
  /** Value on a 0..max scale. */
  value: number;
  max?: number;
  /** Small caption under the number (e.g. "OVR"). */
  caption?: string;
  size?: number;
}

/** Colour bands matching a 1..100 football rating. */
function ratingColor(value: number): string {
  if (value >= 80) return '#22c55e';
  if (value >= 65) return '#84cc16';
  if (value >= 50) return '#eab308';
  if (value >= 35) return '#f59e0b';
  return '#ef4444';
}

/** A circular rating gauge in the style of modern football games. */
export function AbilityRing({
  value,
  max = 100,
  caption,
  size = 76,
}: AbilityRingProps) {
  const rounded = Math.round(value);
  const pct = Math.max(0, Math.min(1, value / max));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = ratingColor((value / max) * 100);

  return (
    <div
      className="ovr-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${caption ?? 'Valutazione'}: ${rounded} su ${max}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ovr-ring-text">
        <strong style={{ color }}>{rounded}</strong>
        {caption ? <span>{caption}</span> : null}
      </div>
    </div>
  );
}
