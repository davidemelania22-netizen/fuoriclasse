interface StatBarProps {
  label: string;
  value: number;
  max?: number;
}

export function StatBar({ label, value, max = 100 }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-track" aria-hidden>
        <span className="stat-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="stat-value">{Math.round(value)}</span>
    </div>
  );
}
