import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type MarketOfferView,
  type NegotiationAsk,
  type NegotiationPreview,
} from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { formatMoney, usePreferences } from '../stores/usePreferences';

interface MarketPageProps {
  saveId: string;
}

const ASKS: { key: NegotiationAsk; label: string }[] = [
  { key: 'WAGE', label: '💰 Chiedi più ingaggio' },
  { key: 'ROLE', label: '⭐ Chiedi un ruolo più alto' },
];

/** A signed number reads as an improvement or a step back at a glance. */
function Delta({
  value,
  format,
  betterUp = true,
}: {
  value: number | null;
  format: (v: number) => string;
  betterUp?: boolean;
}) {
  if (value === null || value === 0) return null;
  const good = betterUp ? value > 0 : value < 0;
  return (
    <span className={`mk-delta ${good ? 'is-up' : 'is-down'}`}>
      {value > 0 ? '▲' : '▼'} {format(Math.abs(value))}
    </span>
  );
}

function OfferCard({
  offer,
  saveId,
  windowOpen,
  currency,
}: {
  offer: MarketOfferView;
  saveId: string;
  windowOpen: boolean;
  currency: Parameters<typeof formatMoney>[1];
}) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<
    (NegotiationPreview & { ask: NegotiationAsk }) | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshAll = () =>
    Promise.all(
      ['market', 'offers', 'dashboard', 'saves'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );

  const askPreview = useMutation({
    mutationFn: (ask: NegotiationAsk) =>
      api.previewNegotiation(saveId, offer.id, ask),
    onSuccess: (data, ask) => setPreview({ ...data, ask }),
  });

  const negotiate = useMutation({
    mutationFn: (ask: NegotiationAsk) => api.negotiate(saveId, offer.id, ask),
    onSuccess: async (outcome) => {
      setPreview(null);
      setMessage(
        outcome.succeeded
          ? `Hanno ceduto: ${outcome.weeklyWage.toLocaleString('it-IT')} € a settimana, ruolo ${outcome.squadRoleLabel}.`
          : `Non hanno ceduto: restano ${outcome.weeklyWage.toLocaleString('it-IT')} € e il ruolo di ${outcome.squadRoleLabel}.`,
      );
      await refreshAll();
    },
  });

  const respond = useMutation({
    mutationFn: (accept: boolean) => api.respondOffer(saveId, offer.id, accept),
    onSuccess: async (result) => {
      setMessage(
        result.accepted ? 'Hai firmato: nuova squadra.' : 'Offerta rifiutata.',
      );
      await refreshAll();
    },
    onError: () => setMessage('Il mercato è chiuso: non puoi firmare adesso.'),
  });

  const busy = negotiate.isPending || respond.isPending;

  return (
    <li className="mk-offer card">
      <div className="mk-offer-head">
        {offer.clubLogo && <img src={offer.clubLogo} alt="" />}
        <div>
          <p className="mk-club">{offer.clubName}</p>
          <p className="mk-comp">
            {offer.competitionName ?? 'Competizione sconosciuta'}
            <Delta
              value={offer.reputationDelta}
              format={(v) => `${Math.round(v)} di reputazione`}
            />
          </p>
        </div>
      </div>

      <dl className="mk-terms">
        <div>
          <dt>Ingaggio</dt>
          <dd>
            {formatMoney(offer.weeklyWage, currency)} / sett.
            <Delta
              value={offer.wageDelta}
              format={(v) => formatMoney(v, currency)}
            />
          </dd>
        </div>
        <div>
          <dt>Ruolo in rosa</dt>
          <dd>
            {offer.squadRoleLabel}
            <Delta
              value={offer.roleDelta}
              format={(v) => `${v} livell${v === 1 ? 'o' : 'i'}`}
            />
          </dd>
        </div>
        <div>
          <dt>Durata</dt>
          <dd>
            {offer.contractYears} {offer.contractYears === 1 ? 'anno' : 'anni'}
          </dd>
        </div>
        <div>
          <dt>Costo del cartellino</dt>
          <dd>{formatMoney(offer.fee, currency)}</dd>
        </div>
      </dl>

      {message && <p className="mk-message">{message}</p>}

      {/* Odds first, commitment second — the same deal every gamble in this
          game offers. */}
      {preview && (
        <div className="mk-negotiation">
          <p className="mk-odds">
            <strong>{Math.round(preview.successChance * 100)}%</strong> che
            accettino
          </p>
          <p className="mk-outcome is-up">✓ {preview.successLabel}</p>
          <p className="mk-outcome is-down">✗ {preview.failureLabel}</p>
          <div className="mk-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => negotiate.mutate(preview.ask)}
            >
              {negotiate.isPending ? 'Trattativa…' : 'Prova'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setPreview(null)}
            >
              Lascia stare
            </button>
          </div>
        </div>
      )}

      {!preview && (
        <div className="mk-actions">
          <button
            type="button"
            disabled={busy || !windowOpen}
            title={windowOpen ? undefined : 'Il mercato è chiuso'}
            onClick={() => respond.mutate(true)}
          >
            ✍️ Firma
          </button>
          {offer.canNegotiate &&
            ASKS.map((ask) => (
              <button
                key={ask.key}
                type="button"
                className="ghost"
                disabled={busy || askPreview.isPending}
                onClick={() => askPreview.mutate(ask.key)}
              >
                {ask.label}
              </button>
            ))}
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => respond.mutate(false)}
          >
            Rifiuta
          </button>
        </div>
      )}

      {!offer.canNegotiate && !preview && (
        <p className="mk-note">Hai già trattato con questo club.</p>
      )}
    </li>
  );
}

export function MarketPage({ saveId }: MarketPageProps) {
  const close = useGameStore((s) => s.closeOverlay);
  const currency = usePreferences((s) => s.currency);
  const query = useQuery({
    queryKey: ['market', saveId],
    queryFn: () => api.getMarket(saveId),
  });
  const m = query.data;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>🔁 Mercato</strong>
      </div>

      {query.isLoading && (
        <section className="card">
          <p className="empty">Caricamento…</p>
        </section>
      )}
      {query.isError && (
        <section className="card">
          <p className="error">Impossibile caricare il mercato.</p>
        </section>
      )}

      {m && (
        <>
          <section
            className={`card mk-window ${m.window.isOpen ? 'is-open' : ''}`}
          >
            <div>
              <p className="mk-window-state">
                {m.window.isOpen
                  ? `${m.window.label} aperto`
                  : `${m.window.label} chiuso`}
              </p>
              <p className="mk-window-when">
                {m.window.isOpen
                  ? `Chiude fra ${m.window.daysAway} giorni, il ${new Date(m.window.closesAt).toLocaleDateString('it-IT')}`
                  : `Riapre fra ${m.window.daysAway} giorni, il ${new Date(m.window.opensAt).toLocaleDateString('it-IT')}`}
              </p>
            </div>
            <dl className="mk-current">
              <div>
                <dt>Oggi giochi nel</dt>
                <dd>{m.current.clubName ?? 'Svincolato'}</dd>
              </div>
              <div>
                <dt>Ingaggio</dt>
                <dd>
                  {m.current.weeklyWage === null
                    ? '—'
                    : `${formatMoney(m.current.weeklyWage, currency)} / sett.`}
                </dd>
              </div>
              <div>
                <dt>Ruolo</dt>
                <dd>{m.current.squadRoleLabel ?? '—'}</dd>
              </div>
              <div>
                <dt>Il tuo valore</dt>
                <dd>{formatMoney(m.current.marketValue, currency)}</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2>Offerte sul tavolo</h2>
            {m.offers.length === 0 ? (
              <p className="empty">
                {m.window.isOpen
                  ? 'Nessuna offerta. Gioca bene e gli osservatori si faranno vivi.'
                  : 'Nessuna offerta: a mercato chiuso i club aspettano. L’interesse che stai costruendo non si perde.'}
              </p>
            ) : (
              <ul className="mk-offers">
                {m.offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    saveId={saveId}
                    windowOpen={m.window.isOpen}
                    currency={currency}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Si muove il mercato</h2>
            {m.worldTransfers.length === 0 ? (
              <p className="empty">
                Ancora nessun trasferimento nel mondo di gioco.
              </p>
            ) : (
              <ul className="mk-world">
                {m.worldTransfers.map((transfer) => (
                  <li key={`${transfer.date}-${transfer.headline}`}>
                    <p className="mk-world-head">{transfer.headline}</p>
                    <p className="mk-world-body">{transfer.body}</p>
                    <p className="mk-world-date">
                      {new Date(transfer.date).toLocaleDateString('it-IT')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
