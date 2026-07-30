import type { CareerTimelineRepository } from '../repositories/career-timeline-repository';

export type CareerTimelineEventType =
  | 'DEBUT'
  | 'FIRST_GOAL'
  | 'APPEARANCE_MILESTONE'
  | 'GOAL_MILESTONE'
  | 'TRANSFER'
  | 'TROPHY'
  | 'AWARD';

export interface CareerTimelineEvent {
  date: string;
  type: CareerTimelineEventType;
  title: string;
  description: string;
}

const APPEARANCE_MILESTONES = [10, 25, 50, 100, 200, 300];
const GOAL_MILESTONES = [5, 10, 25, 50, 100];

const trophyLabel: Record<string, string> = {
  NATIONAL_CUP: 'Coppa Nazionale',
  CONTINENTAL_CUP: 'Coppa Continentale',
  INTERNATIONAL: 'Europei',
};

export async function buildCareerTimeline(
  repository: CareerTimelineRepository,
  saveGameId: string,
): Promise<CareerTimelineEvent[] | null> {
  const data = await repository.loadCareerTimelineData(saveGameId);
  if (!data) return null;

  const events: CareerTimelineEvent[] = [];

  data.contracts.forEach((contract, i) => {
    events.push({
      date: contract.startDate,
      type: 'TRANSFER',
      title: i === 0 ? 'Esordio da professionista' : 'Nuova squadra',
      description:
        i === 0
          ? `Firma il primo contratto professionistico con il ${contract.clubName}.`
          : `Si trasferisce al ${contract.clubName}.`,
    });
  });

  let cumulativeGoals = 0;
  const seenGoalMilestones = new Set<number>();
  const seenAppearanceMilestones = new Set<number>();
  let firstGoalShown = false;

  data.appearances.forEach((appearance, i) => {
    const appearanceNumber = i + 1;
    cumulativeGoals += appearance.goals;

    if (appearanceNumber === 1) {
      events.push({
        date: appearance.date,
        type: 'DEBUT',
        title: 'Esordio in prima squadra',
        description: `Debutta con il ${appearance.clubName} contro il ${appearance.opponentName}.`,
      });
    }
    if (!firstGoalShown && appearance.goals > 0) {
      firstGoalShown = true;
      events.push({
        date: appearance.date,
        type: 'FIRST_GOAL',
        title: 'Primo gol in carriera',
        description: `Segna il suo primo gol da professionista contro il ${appearance.opponentName}.`,
      });
    }
    for (const milestone of APPEARANCE_MILESTONES) {
      if (appearanceNumber === milestone && !seenAppearanceMilestones.has(milestone)) {
        seenAppearanceMilestones.add(milestone);
        events.push({
          date: appearance.date,
          type: 'APPEARANCE_MILESTONE',
          title: `${milestone}ª presenza`,
          description: `Raggiunge quota ${milestone} presenze in carriera.`,
        });
      }
    }
    for (const milestone of GOAL_MILESTONES) {
      if (cumulativeGoals >= milestone && !seenGoalMilestones.has(milestone)) {
        seenGoalMilestones.add(milestone);
        events.push({
          date: appearance.date,
          type: 'GOAL_MILESTONE',
          title: `${milestone}° gol in carriera`,
          description: `Raggiunge quota ${milestone} gol in carriera.`,
        });
      }
    }
  });

  for (const honour of data.honours) {
    if (
      honour.playerId === data.playerId &&
      (honour.type === 'GOLDEN_BOOT' || honour.type === 'BALLON_DOR')
    ) {
      const awardName =
        honour.type === 'GOLDEN_BOOT' ? "Scarpa d'Oro" : "Pallone d'Oro";
      events.push({
        date: honour.createdAt,
        type: 'AWARD',
        title: awardName,
        description: `Si aggiudica ${awardName} del ${honour.competitionName ?? 'campionato'} (${honour.seasonLabel}).`,
      });
    }
  }

  // Team trophies: only counted if the protagonist was actually at that club
  // (by contract date range) — or represented that nationality, for the
  // national-team competition — when the trophy was won.
  for (const honour of data.honours) {
    const label = trophyLabel[honour.type];
    if (!label || !honour.clubId) continue;

    const wonAt = new Date(honour.createdAt).getTime();
    const wonForNationalTeam =
      honour.type === 'INTERNATIONAL' && honour.clubId === data.nationalityId;
    const wonForClub =
      honour.type !== 'INTERNATIONAL' &&
      data.contracts.some((contract, i) => {
        if (contract.clubId !== honour.clubId) return false;
        const start = new Date(contract.startDate).getTime();
        const next = data.contracts[i + 1];
        const end = next ? new Date(next.startDate).getTime() : Infinity;
        return wonAt >= start && wonAt < end;
      });

    if (wonForNationalTeam || wonForClub) {
      events.push({
        date: honour.createdAt,
        type: 'TROPHY',
        title: label,
        description:
          `Vince ${label === 'Europei' ? 'gli Europei' : `la ${label}`}` +
          (honour.competitionName ? ` (${honour.competitionName})` : '') +
          ` — stagione ${honour.seasonLabel}.`,
      });
    }
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return events;
}
