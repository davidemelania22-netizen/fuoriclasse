import type { SaveGameSummary } from '@football-life/shared';

interface SavesListProps {
  saves: SaveGameSummary[];
  onSelect: (id: string) => void;
}

export function SavesList({ saves, onSelect }: SavesListProps) {
  if (saves.length === 0) {
    return <p className="empty">No saved careers yet. Start a new one.</p>;
  }
  return (
    <ul className="saves">
      {saves.map((save) => (
        <li key={save.id}>
          <button type="button" onClick={() => onSelect(save.id)}>
            <strong>{save.name}</strong>
            <span>{save.currentDate.slice(0, 10)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
