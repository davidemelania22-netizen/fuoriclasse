import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ServerSettings, type SnapshotView } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import {
  CURRENCIES,
  TEXT_SCALES,
  usePreferences,
  type Currency,
  type TextScale,
} from '../stores/usePreferences';

/** A row of mutually exclusive buttons — the segmented control FM uses. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="group">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={option.key === value ? 'is-on' : ''}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="set-row">
      <div>
        <p className="set-label">{label}</p>
        {hint && <p className="set-hint">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-word">{checked ? 'Sì' : 'No'}</span>
        <span className="switch-track">
          <span className="switch-knob" />
        </span>
      </button>
    </div>
  );
}

const size = (bytes: number) => `${Math.round(bytes / 1_048_576)} MB`;

function SnapshotRow({
  snapshot,
  onRestore,
  onDelete,
  busy,
}: {
  snapshot: SnapshotView;
  onRestore: (name: string) => void;
  onDelete: (name: string) => void;
  busy: boolean;
}) {
  return (
    <li className="snap-row">
      <span
        className="snap-kind"
        title={snapshot.automatic ? 'Automatico' : 'Manuale'}
      >
        {snapshot.automatic ? '🕒' : '💾'}
      </span>
      <span className="snap-when">
        {new Date(snapshot.createdAt).toLocaleString('it-IT')}
        <span className="snap-size">{size(snapshot.sizeBytes)}</span>
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => onRestore(snapshot.name)}
      >
        Ripristina
      </button>
      <button
        type="button"
        className="ghost"
        disabled={busy}
        onClick={() => onDelete(snapshot.name)}
        aria-label={`Elimina il salvataggio del ${new Date(snapshot.createdAt).toLocaleString('it-IT')}`}
      >
        🗑
      </button>
    </li>
  );
}

export function SettingsPage() {
  const close = useGameStore((s) => s.closeOverlay);
  const queryClient = useQueryClient();
  const prefs = usePreferences();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });
  const snapshotsQuery = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => api.listSnapshots(),
  });

  const saveSettings = useMutation({
    mutationFn: (settings: ServerSettings) => api.saveSettings(settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
  const takeSnapshot = useMutation({
    mutationFn: () => api.takeSnapshot(),
    onSuccess: async () => {
      setNotice('Salvataggio creato.');
      await queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
  const removeSnapshot = useMutation({
    mutationFn: (name: string) => api.deleteSnapshot(name),
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: ['snapshots'] }),
  });
  const restore = useMutation({
    mutationFn: (name: string) => api.restoreSnapshot(name),
    onSuccess: async () => {
      setConfirming(null);
      setNotice(
        'Partita ripristinata. Torna ai salvataggi per ricaricare la carriera.',
      );
      // Every cached payload now describes a world that no longer exists.
      await queryClient.invalidateQueries();
    },
  });

  const settings = settingsQuery.data?.settings;
  const intervals = settingsQuery.data?.intervals ?? [];
  const patch = (edit: Partial<ServerSettings>) => {
    if (!settings) return;
    saveSettings.mutate({ ...settings, ...edit });
  };

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>⚙️ Impostazioni</strong>
      </div>

      {notice && (
        <section className="card">
          <p className="set-notice">{notice}</p>
        </section>
      )}

      <div className="set-grid">
        {/* Area ---------------------------------------------------------- */}
        <section className="card">
          <h2 className="set-title">Area</h2>
          <div className="set-row">
            <div>
              <p className="set-label">Lingua</p>
              <p className="set-hint">Per ora il gioco parla solo italiano.</p>
            </div>
            <span className="set-static">Italiano</span>
          </div>
          <div className="set-row">
            <p className="set-label">Valuta</p>
            <select
              value={prefs.currency}
              aria-label="Valuta"
              onChange={(e) =>
                prefs.set('currency', e.target.value as Currency)
              }
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.key} value={currency.key}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Salvataggi ---------------------------------------------------- */}
        <section className="card">
          <h2 className="set-title">Salvataggi</h2>
          <p className="set-intro">
            La carriera è scritta su disco a ogni azione: non si perde niente da
            sola. Questi salvataggi servono a <strong>tornare indietro</strong>{' '}
            — annullare un trasferimento, una scommessa, una stagione.
          </p>

          {settingsQuery.isLoading && <p className="empty">Caricamento…</p>}
          {settings && (
            <>
              <Toggle
                label="Usa salvataggi automatici"
                hint="Spento finché non lo accendi tu. Ogni copia pesa quanto il mondo intero."
                checked={settings.autoSaveEnabled}
                onChange={(value) => patch({ autoSaveEnabled: value })}
              />

              <div className="set-row">
                <div>
                  <p className="set-label">Ogni</p>
                  <p className="set-hint">
                    Frequenza dei salvataggi automatici.
                  </p>
                </div>
                <select
                  value={settings.autoSaveEveryWeeks}
                  aria-label="Frequenza dei salvataggi automatici"
                  disabled={!settings.autoSaveEnabled}
                  onChange={(e) =>
                    patch({ autoSaveEveryWeeks: Number(e.target.value) })
                  }
                >
                  {intervals.map((interval) => (
                    <option key={interval.weeks} value={interval.weeks}>
                      {interval.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="set-row">
                <div>
                  <p className="set-label">Quante copie tenere</p>
                  <p className="set-hint">
                    Oltre questo numero la più vecchia viene sostituita. Le
                    copie fatte a mano non si cancellano mai da sole.
                  </p>
                </div>
                <select
                  value={settings.autoSaveKeep}
                  aria-label="Quante copie tenere"
                  disabled={!settings.autoSaveEnabled}
                  onChange={(e) =>
                    patch({ autoSaveKeep: Number(e.target.value) })
                  }
                >
                  {[1, 3, 5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="set-actions">
            <button
              type="button"
              onClick={() => takeSnapshot.mutate()}
              disabled={takeSnapshot.isPending}
            >
              💾 {takeSnapshot.isPending ? 'Salvataggio…' : 'Salva adesso'}
            </button>
          </div>

          <h3 className="set-sub">Partite salvate</h3>
          {snapshotsQuery.data?.snapshots.length === 0 && (
            <p className="empty">Ancora nessun salvataggio.</p>
          )}
          <ul className="snap-list">
            {(snapshotsQuery.data?.snapshots ?? []).map((snapshot) => (
              <SnapshotRow
                key={snapshot.name}
                snapshot={snapshot}
                busy={restore.isPending || removeSnapshot.isPending}
                onRestore={setConfirming}
                onDelete={(name) => removeSnapshot.mutate(name)}
              />
            ))}
          </ul>

          {confirming && (
            <div className="set-confirm">
              <p>
                Ripristinare questo salvataggio? Lo stato attuale del gioco
                viene messo da parte come copia manuale, quindi puoi tornare
                indietro anche da qui.
              </p>
              <div className="set-actions">
                <button
                  type="button"
                  onClick={() => restore.mutate(confirming)}
                  disabled={restore.isPending}
                >
                  {restore.isPending ? 'Ripristino…' : 'Sì, ripristina'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setConfirming(null)}
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Interfaccia --------------------------------------------------- */}
        <section className="card">
          <h2 className="set-title">Interfaccia</h2>
          <div className="set-row set-stack">
            <p className="set-label">Ridimensionamento del testo</p>
            <Segmented<TextScale>
              value={prefs.textScale}
              options={TEXT_SCALES.map((s) => ({ key: s.key, label: s.label }))}
              onChange={(value) => prefs.set('textScale', value)}
            />
          </div>
          <div className="set-row set-stack">
            <div>
              <p className="set-label">Attributi</p>
              <p className="set-hint">
                Come mostrare i valori nella scheda giocatore.
              </p>
            </div>
            <Segmented
              value={prefs.attributeDisplay}
              options={[
                { key: 'numbers' as const, label: '123 Numeri' },
                { key: 'words' as const, label: 'Aa Parole' },
              ]}
              onChange={(value) => prefs.set('attributeDisplay', value)}
            />
          </div>
          <div className="set-row">
            <div>
              <p className="set-label">Schermo intero</p>
              <p className="set-hint">Si esce anche con Esc o con F11.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen();
              }}
            >
              Attiva / disattiva
            </button>
          </div>
        </section>

        {/* Scene e accessibilità ----------------------------------------- */}
        <section className="card">
          <h2 className="set-title">Scene</h2>
          <Toggle
            label="Presentazione al nuovo club"
            hint="La maglia alzata davanti ai fotografi, a ogni firma."
            checked={prefs.playPresentation}
            onChange={(value) => prefs.set('playPresentation', value)}
          />
          <Toggle
            label="Cerimonia di premiazione"
            hint="Il trofeo e i coriandoli, a ogni titolo vinto."
            checked={prefs.playCeremony}
            onChange={(value) => prefs.set('playCeremony', value)}
          />

          <h2 className="set-title set-title-spaced">Accessibilità</h2>
          <Toggle
            label="Riduci le animazioni"
            hint="Toglie movimenti e transizioni in tutto il gioco."
            checked={prefs.reduceMotion}
            onChange={(value) => prefs.set('reduceMotion', value)}
          />

          <div className="set-actions">
            <button type="button" className="ghost" onClick={prefs.reset}>
              Ripristina i valori predefiniti
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
