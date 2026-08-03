import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type ContractPackage,
  type ProposalResult,
  type TalksView,
} from '../api/client';
import { formatMoney, usePreferences } from '../stores/usePreferences';

interface ContractTableProps {
  saveId: string;
  talks: TalksView;
  /** True when a transfer cannot be completed right now. */
  windowShut: boolean;
  onClosed: () => void;
}

const SQUAD_ROLES = [
  { key: 'PROSPECT', label: 'Giovane di prospettiva' },
  { key: 'BACKUP', label: 'Riserva' },
  { key: 'ROTATION', label: 'Rotazione' },
  { key: 'FIRST_TEAM', label: 'Titolare' },
  { key: 'KEY', label: 'Stella' },
] as const;

/** One money term, dragged between what the club offered and the most you may ask. */
function MoneyRow({
  label,
  hint,
  value,
  club,
  limits,
  currency,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  club: number;
  limits: { min: number; max: number };
  currency: Parameters<typeof formatMoney>[1];
  onChange: (value: number) => void;
}) {
  const step = Math.max(1, Math.round((limits.max - limits.min) / 100));
  return (
    <div className="ct-row">
      <div className="ct-label">
        <span>{label}</span>
        <small>{hint}</small>
      </div>
      <div className="ct-control">
        <input
          type="range"
          min={limits.min}
          max={limits.max}
          step={step}
          value={Math.min(limits.max, Math.max(limits.min, value))}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="ct-figures">
          <strong>{formatMoney(value, currency)}</strong>
          <span className="ct-their">loro: {formatMoney(club, currency)}</span>
        </div>
      </div>
    </div>
  );
}

export function ContractTable({
  saveId,
  talks,
  windowShut,
  onClosed,
}: ContractTableProps) {
  const queryClient = useQueryClient();
  const currency = usePreferences((s) => s.currency);
  const [draft, setDraft] = useState<ContractPackage>(talks.clubPosition);
  const [result, setResult] = useState<ProposalResult | null>(null);
  const [signed, setSigned] = useState<string | null>(null);

  // A new round moves the club's position, and the draft should follow it —
  // arguing from a stale sheet is how you accidentally ask for less.
  useEffect(() => setDraft(talks.clubPosition), [talks.clubPosition]);

  const refresh = () =>
    Promise.all(
      ['talks', 'market', 'offers', 'dashboard', 'saves'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );

  const propose = useMutation({
    mutationFn: (proposal: ContractPackage) =>
      api.proposeTerms(saveId, proposal),
    onSuccess: async (data) => {
      setResult(data);
      await refresh();
    },
  });

  const sign = useMutation({
    mutationFn: () => api.signTalks(saveId),
    onSuccess: async (data) => {
      setSigned(
        `Firmato con il ${data.clubName}: ${data.terms.years} ${
          data.terms.years === 1 ? 'anno' : 'anni'
        }, ${formatMoney(data.terms.weeklyWage, currency)} a settimana.`,
      );
      await refresh();
    },
    onError: () => setSigned('Non si può firmare adesso: il mercato è chiuso.'),
  });

  const leave = useMutation({
    mutationFn: () => api.cancelTalks(saveId),
    onSuccess: async () => {
      await refresh();
      onClosed();
    },
  });

  const busy = propose.isPending || sign.isPending || leave.isPending;
  const isRenewal = talks.subject === 'RENEWAL';

  if (signed) {
    return (
      <div className="ct card">
        <p className="ct-signed">{signed}</p>
        <button type="button" onClick={onClosed}>
          Chiudi
        </button>
      </div>
    );
  }

  return (
    <div className="ct card">
      <div className="ct-head">
        <h3>
          {isRenewal ? 'Rinnovo' : 'Trattativa'} · {talks.clubName}
        </h3>
        <span className="ct-patience" title="Quanto ancora ti ascoltano">
          {'●'.repeat(Math.max(0, talks.patience))}
          {'○'.repeat(Math.max(0, 3 - talks.patience))}
        </span>
      </div>

      {talks.lastMessage && (
        <p
          className={`ct-message ${
            talks.lastVerdict === 'ACCEPT'
              ? 'is-good'
              : talks.lastVerdict === 'WALKED_OUT' ||
                  talks.lastVerdict === 'REJECT'
                ? 'is-bad'
                : ''
          }`}
        >
          {talks.lastMessage}
        </p>
      )}

      {talks.status === 'BROKEN' ? (
        <>
          <p className="ct-broken">
            Il tavolo è saltato: non si tratta più. Quello che il club aveva
            messo sul piatto resta però firmabile.
          </p>
          <dl className="ct-final">
            <div>
              <dt>Durata</dt>
              <dd>
                {talks.clubPosition.years}{' '}
                {talks.clubPosition.years === 1 ? 'anno' : 'anni'}
              </dd>
            </div>
            <div>
              <dt>Ingaggio</dt>
              <dd>
                {formatMoney(talks.clubPosition.weeklyWage, currency)} / sett.
              </dd>
            </div>
            <div>
              <dt>Bonus alla firma</dt>
              <dd>{formatMoney(talks.clubPosition.signingBonus, currency)}</dd>
            </div>
            <div>
              <dt>Ruolo</dt>
              <dd>{talks.squadRoleLabel}</dd>
            </div>
          </dl>
          <div className="ct-actions">
            <button
              type="button"
              disabled={busy || (!isRenewal && windowShut)}
              title={
                !isRenewal && windowShut ? 'Il mercato è chiuso' : undefined
              }
              onClick={() => sign.mutate()}
            >
              ✍️ Firma comunque
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => leave.mutate()}
            >
              Lascia perdere
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="ct-terms">
            <div className="ct-row">
              <div className="ct-label">
                <span>Durata</span>
                <small>Quanti anni di contratto</small>
              </div>
              <div className="ct-control">
                <input
                  type="range"
                  min={talks.limits.years.min}
                  max={talks.limits.years.max}
                  step={1}
                  value={draft.years}
                  aria-label="Durata"
                  onChange={(e) =>
                    setDraft({ ...draft, years: Number(e.target.value) })
                  }
                />
                <div className="ct-figures">
                  <strong>
                    {draft.years} {draft.years === 1 ? 'anno' : 'anni'}
                  </strong>
                  <span className="ct-their">
                    loro: {talks.clubPosition.years}
                  </span>
                </div>
              </div>
            </div>

            <MoneyRow
              label="Ingaggio"
              hint="A settimana"
              value={draft.weeklyWage}
              club={talks.clubPosition.weeklyWage}
              limits={talks.limits.weeklyWage}
              currency={currency}
              onChange={(weeklyWage) => setDraft({ ...draft, weeklyWage })}
            />
            <MoneyRow
              label="Bonus alla firma"
              hint="Una tantum, all’accordo"
              value={draft.signingBonus}
              club={talks.clubPosition.signingBonus}
              limits={talks.limits.signingBonus}
              currency={currency}
              onChange={(signingBonus) => setDraft({ ...draft, signingBonus })}
            />
            <MoneyRow
              label="Bonus presenza"
              hint="Per ogni partita giocata"
              value={draft.appearanceBonus}
              club={talks.clubPosition.appearanceBonus}
              limits={talks.limits.appearanceBonus}
              currency={currency}
              onChange={(appearanceBonus) =>
                setDraft({ ...draft, appearanceBonus })
              }
            />
            <MoneyRow
              label="Bonus gol"
              hint="Per ogni gol segnato"
              value={draft.goalBonus}
              club={talks.clubPosition.goalBonus}
              limits={talks.limits.goalBonus}
              currency={currency}
              onChange={(goalBonus) => setDraft({ ...draft, goalBonus })}
            />

            <div className="ct-row">
              <div className="ct-label">
                <span>Ruolo in rosa</span>
                <small>Cosa ti promettono di essere</small>
              </div>
              <div className="ct-control">
                <select
                  value={draft.squadRole}
                  aria-label="Ruolo in rosa"
                  onChange={(e) =>
                    setDraft({ ...draft, squadRole: e.target.value })
                  }
                >
                  {SQUAD_ROLES.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <span className="ct-their">loro: {talks.squadRoleLabel}</span>
              </div>
            </div>
          </div>

          {result && result.verdict === 'COUNTER' && (
            <p className="ct-hint">
              La loro controproposta è già caricata qui sopra: puoi firmarla
              così o ritoccarla ancora.
            </p>
          )}

          <div className="ct-actions">
            <button
              type="button"
              disabled={busy || !talks.isOpen}
              title={
                talks.isOpen
                  ? undefined
                  : 'Il club non tratta più: puoi firmare'
              }
              onClick={() => propose.mutate(draft)}
            >
              {propose.isPending ? 'Al tavolo…' : '🤝 Proponi'}
            </button>
            <button
              type="button"
              disabled={busy || (!isRenewal && windowShut)}
              title={
                !isRenewal && windowShut ? 'Il mercato è chiuso' : undefined
              }
              onClick={() => sign.mutate()}
            >
              ✍️ Firma la loro proposta
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => leave.mutate()}
            >
              Alzati dal tavolo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
