/** One movement to write to the ledger. */
export interface EarningToRecord {
  kind: 'WAGE' | 'APPEARANCE_BONUS' | 'GOAL_BONUS' | 'SIGNING_BONUS';
  label: string;
  amount: number;
}

/** One movement as it is read back for the ledger screen. */
export interface LedgerEntry {
  occurredAt: Date;
  type: string;
  description: string;
  amount: number;
}

export interface FinanceRepository {
  /** Current balance (sum of transactions), or null if the save is unknown. */
  getBalance(saveGameId: string): Promise<number | null>;
  /** Add (or subtract) funds; returns the new balance, or null if unknown. */
  addFunds(
    saveGameId: string,
    amount: number,
    description: string,
  ): Promise<number | null>;
  /**
   * Write what the club owed the player, in one go. Separate from `addFunds`
   * because these carry their real type (WAGE, BONUS) rather than OTHER, and
   * the ledger reads much better for it.
   */
  recordEarnings(
    saveGameId: string,
    earnings: readonly EarningToRecord[],
  ): Promise<number | null>;
  /** Most recent movements first. */
  listTransactions(
    saveGameId: string,
    limit: number,
  ): Promise<LedgerEntry[] | null>;
}
