export interface FinanceRepository {
  /** Current balance (sum of transactions), or null if the save is unknown. */
  getBalance(saveGameId: string): Promise<number | null>;
  /** Add (or subtract) funds; returns the new balance, or null if unknown. */
  addFunds(
    saveGameId: string,
    amount: number,
    description: string,
  ): Promise<number | null>;
}
