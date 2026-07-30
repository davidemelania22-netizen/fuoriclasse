import type { PlayerSummary, SaveGameSummary } from '@football-life/shared';
import { careerStatusLabels, footLabels, label, positionLabels } from '../i18n';
import { AbilityRing } from './AbilityRing';
import { ProfileImage } from './ProfileImage';
import { StatBar } from './StatBar';
import { to20 } from '../utils/scale';
import { ratingTone, ratingWord } from '../utils/words';

export interface InclinationChip {
  key: string;
  label: string;
  description: string;
}

interface PlayerCardProps {
  player: PlayerSummary;
  save: SaveGameSummary;
  avatarUrl?: string | null | undefined;
  onUploadAvatar?: ((file: File) => void) | undefined;
  avatarUploading?: boolean | undefined;
  /** Style identity from the tactical instructions, shown as FM-like traits. */
  inclinations?: InclinationChip[] | undefined;
}

const inclinationIcons: Record<string, string> = {
  SHOOT: '🎯',
  CREATE: '🪄',
  AGGRESSIVE: '🔥',
  DISCIPLINED: '🧊',
};

const statusTone: Record<string, string> = {
  ACTIVE: 'tone-good',
  YOUTH: 'tone-info',
  INJURED: 'tone-bad',
  RETIRED: 'tone-muted',
  UNEMPLOYED: 'tone-warn',
};

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function PlayerCard({
  player,
  save,
  avatarUrl,
  onUploadAvatar,
  avatarUploading,
  inclinations,
}: PlayerCardProps) {
  return (
    <section className="card player-card" aria-label="Profilo del giocatore">
      <div className="player-hero">
        <ProfileImage
          src={avatarUrl}
          size={84}
          onPick={onUploadAvatar}
          uploading={avatarUploading}
          title={`${player.firstName} ${player.lastName}`}
        />
        <div className="player-id">
          <h2>
            {player.firstName} {player.lastName}
          </h2>
          <div className="chips">
            <span className="chip chip-accent">
              {label(positionLabels, player.primaryPosition)}
            </span>
            <span className="chip">
              {label(footLabels, player.preferredFoot)}
            </span>
            <span className={`badge ${statusTone[player.careerStatus] ?? ''}`}>
              {label(careerStatusLabels, player.careerStatus)}
            </span>
            {inclinations?.map((chip) => (
              <span
                key={chip.key}
                className="chip chip-inclination"
                title={chip.description}
              >
                {inclinationIcons[chip.key] ?? '✨'} {chip.label}
              </span>
            ))}
          </div>
          <p className="player-sub">
            {player.ageYears} anni ·{' '}
            {player.clubId
              ? `Sotto contratto · ${player.clubName ?? ''}`.trim()
              : 'Svincolato'}
          </p>
        </div>
        <div className="ovr-block">
          <AbilityRing
            value={to20(player.currentAbility)}
            max={20}
            caption="MEDIA"
          />
          <span
            className={`ovr-word ${ratingTone(to20(player.currentAbility))}`}
          >
            {ratingWord(to20(player.currentAbility))}
          </span>
          <span
            className="pot"
            title={`Potenziale: ${to20(player.potentialAbility)}/20`}
          >
            POT · {ratingWord(to20(player.potentialAbility))}
          </span>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Valore</span>
          <span className="tile-value">{euro.format(player.marketValue)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Forma</span>
          <span className="tile-value">{Math.round(player.form)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Data</span>
          <span className="tile-value">{save.currentDate.slice(0, 10)}</span>
        </div>
      </div>

      <div className="bars">
        <StatBar label="Condizione" value={player.condition} />
        <StatBar label="Stanchezza" value={player.fatigue} invert />
        <StatBar label="Morale" value={player.morale} />
        <StatBar label="Forma" value={player.form} />
        <StatBar label="Stress" value={player.stress} invert />
      </div>
    </section>
  );
}
