import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const day = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
});

interface WalletBarProps {
  saveId: string;
}

/** Always-visible wallet showing the protagonist's current balance. */
export function WalletBar({ saveId }: WalletBarProps) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['finance', saveId],
    queryFn: () => api.getBalance(saveId),
  });

  const balance = query.data?.balance ?? 0;
  const movements = query.data?.movements ?? [];
  const negative = balance < 0;

  return (
    <div className="wallet-wrap">
      <button
        type="button"
        className={`wallet ${negative ? 'wallet-negative' : ''}`}
        title="Portafoglio — da dove arrivano i soldi"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
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
      </button>

      {open && (
        <div className="wallet-ledger">
          <p className="wallet-ledger-title">Ultimi movimenti</p>
          {movements.length === 0 ? (
            <p className="empty">Ancora nessun movimento.</p>
          ) : (
            <ul>
              {movements.map((entry, index) => (
                <li key={`${entry.occurredAt}-${index}`}>
                  <span className="wl-when">
                    {day.format(new Date(entry.occurredAt))}
                  </span>
                  <span className="wl-what">{entry.description}</span>
                  <span
                    className={`wl-amount ${entry.amount < 0 ? 'is-out' : 'is-in'}`}
                  >
                    {entry.amount < 0 ? '' : '+'}
                    {euro.format(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
