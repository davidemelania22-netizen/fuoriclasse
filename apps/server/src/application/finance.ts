import type { FinanceRepository } from '../repositories/finance-repository';

export interface FinanceDeps {
  repository: FinanceRepository;
}

export async function getBalance(
  deps: FinanceDeps,
  saveGameId: string,
): Promise<number | null> {
  return deps.repository.getBalance(saveGameId);
}

export async function grantFunds(
  deps: FinanceDeps,
  input: {
    saveGameId: string;
    amount: number;
    description?: string | undefined;
  },
): Promise<number | null> {
  return deps.repository.addFunds(
    input.saveGameId,
    input.amount,
    input.description ?? 'Editor adjustment',
  );
}
