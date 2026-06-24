import type { PlayerSummary, SaveGameSummary } from '@football-life/shared';
import { StatBar } from './StatBar';

interface PlayerCardProps {
  player: PlayerSummary;
  save: SaveGameSummary;
}

export function PlayerCard({ player, save }: PlayerCardProps) {
  return (
    <section className="card" aria-label="Player profile">
      <header className="card-head">
        <h2>
          {player.firstName} {player.lastName}
        </h2>
        <span className="badge">{player.careerStatus}</span>
      </header>
      <dl className="facts">
        <div>
          <dt>Age</dt>
          <dd>{player.ageYears}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{player.primaryPosition}</dd>
        </div>
        <div>
          <dt>Foot</dt>
          <dd>{player.preferredFoot}</dd>
        </div>
        <div>
          <dt>Ability</dt>
          <dd>
            {Math.round(player.currentAbility)} /{' '}
            {Math.round(player.potentialAbility)}
          </dd>
        </div>
        <div>
          <dt>Club</dt>
          <dd>{player.clubId ? 'Signed' : 'Free agent'}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{save.currentDate.slice(0, 10)}</dd>
        </div>
      </dl>
      <div className="bars">
        <StatBar label="Condition" value={player.condition} />
        <StatBar label="Fatigue" value={player.fatigue} />
        <StatBar label="Morale" value={player.morale} />
        <StatBar label="Form" value={player.form} />
        <StatBar label="Stress" value={player.stress} />
      </div>
    </section>
  );
}
