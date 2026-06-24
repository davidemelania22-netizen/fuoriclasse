import type { PendingEventView } from '../api/client';
import { eventCategoryLabels, label } from '../i18n';

interface EventCardProps {
  event: PendingEventView;
  disabled?: boolean;
  onChoose: (eventId: string, choiceKey: string) => void;
}

export function EventCard({ event, disabled, onChoose }: EventCardProps) {
  return (
    <article className="card event" aria-label={`Evento: ${event.title}`}>
      <header className="card-head">
        <h3>{event.title}</h3>
        <span className="badge">
          {label(eventCategoryLabels, event.category)}
        </span>
      </header>
      <p>{event.description}</p>
      <div className="choices">
        {event.choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(event.id, choice.key)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </article>
  );
}
