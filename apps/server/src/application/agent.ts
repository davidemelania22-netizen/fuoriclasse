import type { Agent, AgentRequestType } from '@football-life/shared';
import { AGENTS } from '@football-life/game-data';
import type { FinanceRepository } from '../repositories/finance-repository';
import type { ProfileRepository } from '../repositories/profile-repository';
import { generateProtagonistOffers, type CareerDeps } from './career';
import {
  openTalks,
  RENEWAL_SUBJECT,
  type TalksDeps,
} from './contract-talks';

const euro = (n: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

export function getAgent(key: string | null | undefined): Agent | undefined {
  return AGENTS.find((agent) => agent.key === key);
}

export async function listAgents(
  profileRepo: ProfileRepository,
  saveGameId: string,
): Promise<{ agents: Agent[]; currentAgentKey: string | null } | null> {
  const profile = await profileRepo.getProfile(saveGameId);
  if (!profile) return null;
  return { agents: AGENTS, currentAgentKey: profile.agentKey };
}

export async function chooseAgent(
  profileRepo: ProfileRepository,
  input: { saveGameId: string; agentKey: string },
): Promise<{ status: 'ok' | 'not-found' | 'save-not-found' }> {
  if (!AGENTS.some((agent) => agent.key === input.agentKey)) {
    return { status: 'not-found' };
  }
  const ok = await profileRepo.setAgent(input.saveGameId, input.agentKey);
  return { status: ok ? 'ok' : 'save-not-found' };
}

export interface AgentActionDeps extends CareerDeps {
  profileRepo: ProfileRepository;
  financeRepo: FinanceRepository;
  /** Contract matters go through the table, agent or no agent. */
  talks: TalksDeps;
}

export type AgentActionResult =
  | { status: 'ok'; message: string; balance?: number }
  | { status: 'no-agent' }
  | { status: 'no-contract' }
  | { status: 'save-not-found' };

/**
 * How much better an opening package an agent can extract before the player
 * even sits down. A well-connected agent is worth roughly a tenth; nobody is
 * worth a new contract on their own.
 */
function agentEdge(contacts: number): number {
  return 1 + Math.min(0.12, 0.02 * contacts);
}

/**
 * Ask the agent to go and get you a better deal.
 *
 * This used to be a button that raised the wage every time it was pressed —
 * eight clicks turned 2.302 € a week into 8.900 €, and no club ever said no.
 * Now it opens the same table everything else goes through: the club can
 * refuse to sit down at all, and what the agent is actually worth is a better
 * opening package, not a free rise.
 */
export async function negotiateWage(
  deps: AgentActionDeps,
  input: { saveGameId: string },
): Promise<AgentActionResult> {
  const profile = await deps.profileRepo.getProfile(input.saveGameId);
  if (!profile) return { status: 'save-not-found' };
  const agent = getAgent(profile.agentKey);
  if (!agent) return { status: 'no-agent' };

  const career = await deps.repository.loadProtagonist(input.saveGameId);
  if (!career) return { status: 'save-not-found' };
  if (!career.currentContract) return { status: 'no-contract' };

  const opened = await openTalks(deps.talks, {
    saveGameId: input.saveGameId,
    subject: RENEWAL_SUBJECT,
  });
  if (!opened) return { status: 'save-not-found' };
  if (opened.status === 'REFUSED') {
    return {
      status: 'ok',
      message: `${agent.name} ha provato a muoversi, ma è tornato con un no. ${opened.message}`,
    };
  }

  // The agent's weight is felt in what the club puts on the table first, and
  // exactly once: pressing the button again only walks you back to the table
  // that is already open.
  const talks = opened.talks;
  if (talks.agentBoosted || talks.round > 0) {
    return {
      status: 'ok',
      message: `${agent.name} ha già fatto la sua parte: il tavolo è aperto e il club è fermo a ${euro(talks.clubPosition.weeklyWage)} a settimana. Il resto lo tratti tu.`,
    };
  }

  const edge = agentEdge(agent.contacts);
  const improved = {
    ...talks.baseline,
    weeklyWage: Math.round(talks.baseline.weeklyWage * edge),
    signingBonus: Math.round(talks.baseline.signingBonus * edge),
  };
  await deps.talks.profile.setContractTalks(input.saveGameId, {
    ...talks,
    baseline: improved,
    clubPosition: improved,
    agentBoosted: true,
  });

  return {
    status: 'ok',
    message: `${agent.name} ha aperto il tavolo e ha già strappato qualcosa: si parte da ${euro(improved.weeklyWage)} a settimana invece di ${euro(talks.baseline.weeklyWage)}. Ora tocca a te, al tavolo del contratto.`,
  };
}

export async function requestFromAgent(
  deps: AgentActionDeps,
  input: { saveGameId: string; type: AgentRequestType },
): Promise<AgentActionResult> {
  const profile = await deps.profileRepo.getProfile(input.saveGameId);
  if (!profile) return { status: 'save-not-found' };
  const agent = getAgent(profile.agentKey);
  if (!agent) return { status: 'no-agent' };

  if (input.type === 'sponsor') {
    const gross = 4_000 * agent.contacts;
    const commission = Math.round((gross * agent.commissionPct) / 100);
    const net = gross - commission;
    const balance = await deps.financeRepo.addFunds(
      input.saveGameId,
      net,
      `Sponsor tramite ${agent.name}`,
    );
    if (balance === null) return { status: 'save-not-found' };
    return {
      status: 'ok',
      balance,
      message: `${agent.name} ti ha trovato uno sponsor: ${euro(gross)} (commissione ${euro(commission)}, netto ${euro(net)}).`,
    };
  }

  if (input.type === 'transfer') {
    const offers = await generateProtagonistOffers(deps, {
      saveGameId: input.saveGameId,
    });
    if (offers === null) return { status: 'save-not-found' };
    const message =
      offers.length > 0
        ? `${agent.name} ha messo in moto il mercato: ${offers.length} offerte sul tavolo.`
        : `${agent.name} ci ha provato, ma per ora nessun club si è fatto avanti.`;
    return { status: 'ok', message };
  }

  // A renewal is the same conversation as asking for more money: one door.
  return negotiateWage(deps, { saveGameId: input.saveGameId });
}
