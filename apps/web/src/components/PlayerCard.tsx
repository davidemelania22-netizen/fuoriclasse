import type { PlayerSummary, SaveGameSummary } from '@football-life/shared';
import { careerStatusLabels, footLabels, label, positionLabels } from '../i18n';
import { StatBar } from './StatBar';

interface PlayerCardProps {
  player: PlayerSummary;
  save: SaveGameSummary;
}

export function PlayerCard({ player, save }: PlayerCardProps) {
  return (
    <section className="card" aria-label="Profilo del giocatore">
      <header className="card-head">
        <h2>
          {player.firstName} {player.lastName}
        </h2>
        <span className="badge">
          {label(careerStatusLabels, player.careerStatus)}
        </span>
      </header>
      <dl className="facts">
        <div>
          <dt>Età</dt>
          <dd>{player.ageYears}</dd>
        </div>
        <div>
          <dt>Ruolo</dt>
          <dd>{label(positionLabels, player.primaryPosition)}</dd>
        </div>
        <div>
          <dt>Piede</dt>
          <dd>{label(footLabels, player.preferredFoot)}</dd>
        </div>
        <div>
          <dt>Abilità</dt>
          <dd>
            {Math.round(player.currentAbility)} /{' '}
            {Math.round(player.potentialAbility)}
          </dd>
        </div>
        <div>
          <dt>Squadra</dt>
          <dd>{player.clubId ? 'Sotto contratto' : 'Svincolato'}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{save.currentDate.slice(0, 10)}</dd>
        </div>
      </dl>
      <div className="bars">
        <StatBar label="Condizione" value={player.condition} />
        <StatBar label="Stanchezza" value={player.fatigue} />
        <StatBar label="Morale" value={player.morale} />
        <StatBar label="Forma" value={player.form} />
        <StatBar label="Stress" value={player.stress} />
      </div>
    </section>
  );
}
