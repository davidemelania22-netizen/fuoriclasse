import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AgentRequestType } from '@football-life/shared';
import { api, type AgentActionResult } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { WalletBar } from '../components/WalletBar';

interface AgentPageProps {
  saveId: string;
}

function contactDots(n: number): string {
  return '●'.repeat(n) + '○'.repeat(5 - n);
}

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const squadRoleLabels: Record<string, string> = {
  KEY: 'Stella della squadra',
  FIRST_TEAM: 'Titolare',
  ROTATION: 'Rotazione',
  BACKUP: 'Riserva',
  PROSPECT: 'Giovane promessa',
};

type Intent = 'wage' | AgentRequestType | null;

/** Map a free-text request to the closest structured intent (offline). */
function intentOf(text: string): Intent {
  const t = text.toLowerCase();
  if (/stipendio|aumento|paga|guadagn|ingaggio/.test(t)) return 'wage';
  if (/sponsor|pubblicit|spot|testimonial|brand/.test(t)) return 'sponsor';
  if (/trasferiment|cambiare squadra|cambiare club|andare via|cedere|vendere|cessione|nuovo club|nuova squadra/.test(t))
    return 'transfer';
  if (/rinnov|prolung|restare|resto/.test(t)) return 'renewal';
  return null;
}

export function AgentPage({ saveId }: AgentPageProps) {
  const queryClient = useQueryClient();
  const close = useGameStore((s) => s.closeOverlay);
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const agentsQuery = useQuery({
    queryKey: ['agents', saveId],
    queryFn: () => api.listAgents(saveId),
  });

  const offersQuery = useQuery({
    queryKey: ['offers', saveId],
    queryFn: () => api.listOffers(saveId),
  });

  const afterAction = async (res: AgentActionResult) => {
    setResult(res.message);
    await queryClient.invalidateQueries({ queryKey: ['finance', saveId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
    await queryClient.invalidateQueries({ queryKey: ['offers', saveId] });
  };

  const respondMutation = useMutation({
    mutationFn: ({ offerId, accept }: { offerId: string; accept: boolean }) =>
      api.respondOffer(saveId, offerId, accept),
    onSuccess: async (res) => {
      setResult(
        res.accepted
          ? 'Hai accettato l’offerta: nuova squadra e nuovo contratto!'
          : 'Offerta rifiutata.',
      );
      await queryClient.invalidateQueries({ queryKey: ['offers', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['finance', saveId] });
    },
  });

  const chooseMutation = useMutation({
    mutationFn: (agentKey: string) => api.chooseAgent(saveId, agentKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agents', saveId] });
      setResult('Hai ingaggiato un nuovo procuratore.');
    },
  });

  const wageMutation = useMutation({
    mutationFn: () => api.negotiateWage(saveId),
    onSuccess: afterAction,
  });

  const requestMutation = useMutation({
    mutationFn: (type: AgentRequestType) => api.agentRequest(saveId, type),
    onSuccess: afterAction,
  });

  const busy =
    chooseMutation.isPending ||
    wageMutation.isPending ||
    requestMutation.isPending;

  const currentKey = agentsQuery.data?.currentAgentKey ?? null;
  const hasAgent = currentKey !== null;

  const submitText = () => {
    const intent = intentOf(text);
    if (intent === null) {
      setResult(
        'Il procuratore non ha capito. Prova con: stipendio, sponsor, trasferimento o rinnovo.',
      );
      return;
    }
    if (intent === 'wage') wageMutation.mutate();
    else requestMutation.mutate(intent);
  };

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>Procuratore</strong>
        <WalletBar saveId={saveId} />
      </div>

      <section className="card">
        <h2>Il tuo procuratore</h2>
        <p className="shop-intro">
          Scegli chi cura i tuoi interessi. Contatti più forti ottengono aumenti
          e sponsor migliori, ma di solito chiedono una commissione più alta.
        </p>
        {agentsQuery.isLoading && <p className="empty">Caricamento…</p>}
        <ul className="agent-list">
          {agentsQuery.data?.agents.map((agent) => {
            const current = agent.key === currentKey;
            return (
              <li
                key={agent.key}
                className={`agent-row ${current ? 'agent-current' : ''}`}
              >
                <div className="agent-info">
                  <strong>{agent.name}</strong>
                  <span className="agent-meta">
                    <span className="chip">Commissione {agent.commissionPct}%</span>
                    <span className="agent-contacts" title="Contatti">
                      {contactDots(agent.contacts)}
                    </span>
                  </span>
                  <span className="shop-desc">{agent.blurb}</span>
                </div>
                <button
                  type="button"
                  disabled={busy || current}
                  onClick={() => chooseMutation.mutate(agent.key)}
                >
                  {current ? 'Attuale' : 'Ingaggia'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2>Trattative e richieste</h2>
        {!hasAgent && (
          <p className="empty">Scegli prima un procuratore qui sopra.</p>
        )}
        <div className="agent-actions">
          <button
            type="button"
            disabled={!hasAgent || busy}
            onClick={() => wageMutation.mutate()}
          >
            💶 Contratta lo stipendio
          </button>
          <button
            type="button"
            className="ghost"
            disabled={!hasAgent || busy}
            onClick={() => requestMutation.mutate('sponsor')}
          >
            🤝 Trova uno sponsor
          </button>
          <button
            type="button"
            className="ghost"
            disabled={!hasAgent || busy}
            onClick={() => requestMutation.mutate('transfer')}
          >
            ✈️ Cerca un trasferimento
          </button>
          <button
            type="button"
            className="ghost"
            disabled={!hasAgent || busy}
            onClick={() => requestMutation.mutate('renewal')}
          >
            📝 Chiedi il rinnovo
          </button>
        </div>

        <label className="agent-write">
          Scrivi una richiesta al procuratore
          <textarea
            rows={2}
            placeholder="Es. «Trovami un club più ambizioso» oppure «Voglio un aumento»"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!hasAgent || busy}
          />
        </label>
        <button
          type="button"
          disabled={!hasAgent || busy || text.trim().length === 0}
          onClick={submitText}
        >
          Invia richiesta
        </button>

        {result && <p className="agent-result">{result}</p>}
      </section>

      <section className="card">
        <h2>Offerte sul tavolo</h2>
        {offersQuery.isLoading && <p className="empty">Caricamento…</p>}
        {offersQuery.data && offersQuery.data.length === 0 && (
          <p className="empty">
            Nessuna offerta. Chiedi al procuratore di cercare un trasferimento.
          </p>
        )}
        <ul className="offer-list">
          {offersQuery.data?.map((offer) => (
            <li key={offer.id} className="offer-row">
              <div className="offer-info">
                <div className="offer-head">
                  <strong>{offer.clubName}</strong>
                  <span className="chip">
                    {squadRoleLabels[offer.squadRole] ?? offer.squadRole}
                  </span>
                </div>
                <span className="offer-terms">
                  {euro.format(offer.weeklyWage)}/sett · {offer.contractYears}{' '}
                  anni · offerta {euro.format(offer.fee)} · rep{' '}
                  {offer.clubReputation}
                </span>
              </div>
              <div className="offer-actions">
                <button
                  type="button"
                  disabled={respondMutation.isPending}
                  onClick={() =>
                    respondMutation.mutate({ offerId: offer.id, accept: true })
                  }
                >
                  Accetta
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={respondMutation.isPending}
                  onClick={() =>
                    respondMutation.mutate({ offerId: offer.id, accept: false })
                  }
                >
                  Rifiuta
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
