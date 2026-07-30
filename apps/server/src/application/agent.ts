import type { Agent, AgentRequestType } from '@football-life/shared';
import { AGENTS } from '@football-life/game-data';
import type { FinanceRepository } from '../repositories/finance-repository';
import type { ProfileRepository } from '../repositories/profile-repository';
import {
  generateProtagonistOffers,
  renewProtagonistContract,
  type CareerDeps,
} from './career';

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
}

export type AgentActionResult =
  | { status: 'ok'; message: string; balance?: number }
  | { status: 'no-agent' }
  | { status: 'no-contract' }
  | { status: 'save-not-found' };

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

  const old = career.currentContract.weeklyWage;
  const factor = 1 + 0.03 * agent.contacts + career.currentAbility / 1000;
  const newWage = Math.max(old, Math.min(Math.round(old * factor), Math.round(old * 1.6)));

  await deps.repository.renewContract({
    contractId: career.currentContract.id,
    newEndDate: career.currentContract.endDate,
    weeklyWage: newWage,
    squadRole: career.currentContract.squadRole,
  });

  const message =
    newWage > old
      ? `${agent.name} ha strappato un aumento: stipendio da ${euro(old)} a ${euro(newWage)} a settimana.`
      : `${agent.name} non è riuscito a ottenere di più: lo stipendio resta ${euro(old)} a settimana.`;
  return { status: 'ok', message };
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

  // renewal
  const result = await renewProtagonistContract(deps, {
    saveGameId: input.saveGameId,
  });
  if (!result) return { status: 'no-contract' };
  return {
    status: 'ok',
    message: `${agent.name} ha rinnovato il tuo contratto: ${euro(result.weeklyWage)} a settimana fino al ${result.newEndDate.slice(0, 10)}.`,
  };
}
