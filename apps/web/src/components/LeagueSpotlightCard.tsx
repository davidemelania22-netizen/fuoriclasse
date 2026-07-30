import type { LeagueSpotlight } from '../api/client';

/** Mirrors BALLON_DOR_MIN_STRENGTH on the server: below this, no world award. */
const BALLON_DOR_MIN_STRENGTH = 0.78;

interface LeagueSpotlightCardProps {
  spotlight: LeagueSpotlight;
}

interface Effect {
  icon: string;
  title: string;
  text: string;
  tone: 'up' | 'flat' | 'down';
}

function growthEffect(spotlight: LeagueSpotlight): Effect {
  if (spotlight.growthModifier >= 1.04) {
    return {
      icon: '📈',
      title: 'Crescita',
      text: 'Ti alleni e giochi contro gente più forte: qui si migliora più in fretta.',
      tone: 'up',
    };
  }
  if (spotlight.growthModifier >= 0.97) {
    return {
      icon: '📈',
      title: 'Crescita',
      text: 'Il livello degli avversari è nella norma: cresci al tuo ritmo.',
      tone: 'flat',
    };
  }
  return {
    icon: '📉',
    title: 'Crescita',
    text: 'Il livello è basso: allenarsi qui rende meno, migliorare costa più tempo.',
    tone: 'down',
  };
}

function fameEffect(spotlight: LeagueSpotlight): Effect {
  if (spotlight.strength >= 0.9) {
    return {
      icon: '🌍',
      title: 'Fama',
      text: 'Ogni grande partita fa il giro del mondo: qui il nome si costruisce in fretta.',
      tone: 'up',
    };
  }
  if (spotlight.strength >= 0.7) {
    return {
      icon: '🗞️',
      title: 'Fama',
      text: 'Le tue prestazioni si notano, ma la voce fatica a superare i confini.',
      tone: 'flat',
    };
  }
  return {
    icon: '🔇',
    title: 'Fama',
    text: 'Quello che fai qui resta quasi tutto tra queste mura: la fama sale piano.',
    tone: 'down',
  };
}

function scoutEffect(spotlight: LeagueSpotlight): Effect {
  if (spotlight.scoutAttention >= 1) {
    return {
      icon: '🔭',
      title: 'Osservatori',
      text: 'Gli emissari dei grandi club sono in tribuna quasi ogni settimana.',
      tone: 'up',
    };
  }
  if (spotlight.scoutAttention >= 0.75) {
    return {
      icon: '🔭',
      title: 'Osservatori',
      text: 'Qualche osservatore passa a vederti: le occasioni arrivano, ma vanno aspettate.',
      tone: 'flat',
    };
  }
  return {
    icon: '🔭',
    title: 'Osservatori',
    text: 'Da queste parti gli osservatori vengono di rado: farsi vedere è la parte difficile.',
    tone: 'down',
  };
}

/**
 * The shop window the career is played in. Same number behind the scenes,
 * three different consequences the player can actually feel.
 */
export function LeagueSpotlightCard({ spotlight }: LeagueSpotlightCardProps) {
  const effects = [
    growthEffect(spotlight),
    fameEffect(spotlight),
    scoutEffect(spotlight),
  ];

  return (
    <section className="card spotlight-card">
      <div className="spotlight-head">
        <h2>🏟️ La tua vetrina</h2>
        <span className="chip chip-accent spotlight-chip">
          {'★'.repeat(spotlight.stars)}
          {'☆'.repeat(5 - spotlight.stars)} {spotlight.label}
        </span>
      </div>
      <p className="spotlight-intro">
        Giochi in <strong>{spotlight.competitionName}</strong>. Il campionato in
        cui giochi non cambia solo gli avversari: cambia quanto cresci, quanto
        si parla di te e chi viene a guardarti.
      </p>
      <ul className="spotlight-effects">
        {effects.map((effect) => (
          <li key={effect.title} className={`spotlight-effect ${effect.tone}`}>
            <span className="spotlight-icon">{effect.icon}</span>
            <span className="spotlight-body">
              <strong>{effect.title}</strong>
              <span>{effect.text}</span>
            </span>
          </li>
        ))}
      </ul>
      {spotlight.strength < BALLON_DOR_MIN_STRENGTH && (
        <p className="spotlight-note">
          🥇 Da qui il Pallone d&apos;Oro non si vince: per entrare nel giro che
          conta serve salire di categoria.
        </p>
      )}
    </section>
  );
}
