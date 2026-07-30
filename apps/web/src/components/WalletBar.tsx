import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

interface WalletBarProps {
  saveId: string;
}

/** Always-visible wallet showing the protagonist's current balance. */
export function WalletBar({ saveId }: WalletBarProps) {
  const query = useQuery({
    queryKey: ['finance', saveId],
    queryFn: () => api.getBalance(saveId),
  });

  const balance = query.data?.balance ?? 0;
  const negative = balance < 0;

  return (
    <div
      className={`wallet ${negative ? 'wallet-negative' : ''}`}
      title="Portafoglio"
    >
      <span className="wallet-icon" aria-hidden>
        💰
      </span>
      <span className="wallet-meta">
        <span className="wallet-label">Portafoglio</span>
        <span className="wallet-value">
          {query.isLoading ? '…' : euro.format(balance)}
        </span>
      </span>
    </div>
  );
}
