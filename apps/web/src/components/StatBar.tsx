interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  /** When true, high values are "bad" (e.g. stress, fatigue) and colour inverts. */
  invert?: boolean;
}

function toneColor(pct: number, invert: boolean): string {
  const good = invert ? 100 - pct : pct;
  if (good >= 70) return '#22c55e';
  if (good >= 45) return '#eab308';
  if (good >= 25) return '#f59e0b';
  return '#ef4444';
}

export function StatBar({
  label,
  value,
  max = 100,
  invert = false,
}: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = toneColor(pct, invert);
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-track" aria-hidden>
        <span
          className="stat-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </span>
      <span className="stat-value">{Math.round(value)}</span>
    </div>
  );
}
