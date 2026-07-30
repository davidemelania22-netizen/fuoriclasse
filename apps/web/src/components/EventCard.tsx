import type {
  EventChoiceView,
  EventConsequenceView,
  PendingEventView,
} from '../api/client';
import { eventCategoryLabels, label } from '../i18n';
import { consequenceChips, percentWord } from '../utils/consequences';

interface EventCardProps {
  event: PendingEventView;
  disabled?: boolean;
  onChoose: (eventId: string, choiceKey: string) => void;
}

function Chips({
  consequences,
  prefix,
}: {
  consequences: EventConsequenceView;
  prefix?: string;
}) {
  const chips = consequenceChips(consequences);
  if (chips.length === 0) return null;
  return (
    <span className="effect-chips">
      {prefix && <span className="effect-prefix">{prefix}</span>}
      {chips.map((chip) => (
        <span key={chip.label} className={`effect-chip ${chip.tone}`}>
          {chip.label}
        </span>
      ))}
    </span>
  );
}

/** A choice you can weigh: what it does for sure, and what it risks. */
function Choice({
  choice,
  disabled,
  onChoose,
}: {
  choice: EventChoiceView;
  disabled?: boolean;
  onChoose: () => void;
}) {
  const { gamble } = choice;
  return (
    <button
      type="button"
      className={`choice${gamble ? ' choice-gamble' : ''}`}
      disabled={disabled}
      onClick={onChoose}
    >
      <span className="choice-label">{choice.label}</span>
      <Chips
        consequences={choice.consequences}
        {...(gamble ? { prefix: 'Comunque vada' } : {})}
      />
      {gamble && (
        <span className="gamble">
          <span className="gamble-bar" aria-hidden="true">
            <span
              className="gamble-fill"
              style={{ width: `${Math.round(gamble.successChance * 100)}%` }}
            />
          </span>
          <span className="gamble-row up">
            <strong>{percentWord(gamble.successChance)}</strong>
            <Chips consequences={gamble.success} />
          </span>
          <span className="gamble-row down">
            <strong>{percentWord(1 - gamble.successChance)}</strong>
            <Chips consequences={gamble.failure} />
          </span>
        </span>
      )}
    </button>
  );
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
          <Choice
            key={choice.key}
            choice={choice}
            {...(disabled !== undefined ? { disabled } : {})}
            onChoose={() => onChoose(event.id, choice.key)}
          />
        ))}
      </div>
    </article>
  );
}
