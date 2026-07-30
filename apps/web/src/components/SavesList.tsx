import type { SaveGameSummary } from '@football-life/shared';
import { ProfileImage } from './ProfileImage';

interface SavesListProps {
  saves: SaveGameSummary[];
  onSelect: (id: string) => void;
  onDelete: (save: SaveGameSummary) => void;
  deletingId?: string | null;
}

export function SavesList({
  saves,
  onSelect,
  onDelete,
  deletingId,
}: SavesListProps) {
  if (saves.length === 0) {
    return <p className="empty">Nessuna carriera salvata. Inizia una nuova.</p>;
  }
  return (
    <ul className="saves">
      {saves.map((save) => (
        <li key={save.id}>
          <button
            type="button"
            className="save-open"
            onClick={() => onSelect(save.id)}
          >
            <ProfileImage size={44} />
            <span className="save-meta">
              <strong>{save.name}</strong>
              <span>{save.currentDate.slice(0, 10)}</span>
            </span>
          </button>
          <button
            type="button"
            className="save-delete"
            aria-label={`Elimina ${save.name}`}
            title="Elimina salvataggio"
            disabled={deletingId === save.id}
            onClick={() => onDelete(save)}
          >
            {deletingId === save.id ? '…' : '🗑'}
          </button>
        </li>
      ))}
    </ul>
  );
}
