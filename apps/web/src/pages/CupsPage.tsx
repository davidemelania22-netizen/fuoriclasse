import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type SeasonAwardsResult,
  type SimulateContinentalResult,
  type SimulateCupResult,
  type SimulateNationalTeamResult,
} from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { WalletBar } from '../components/WalletBar';

interface CupsPageProps {
  saveId: string;
}

const honourTypeLabels: Record<string, string> = {
  LEAGUE_TITLE: 'Titolo di Lega',
  NATIONAL_CUP: 'Coppa Nazionale',
  CONTINENTAL_CUP: 'Coppa Continentale',
  INTERNATIONAL: 'Torneo Internazionale',
  BALLON_DOR: "Sfera d'Oro",
  GOLDEN_BOOT: 'Scarpa Dorata',
};

function KnockoutResultView({
  result,
  notParticipatedMessage = 'Il tuo club non ha partecipato a questa edizione.',
}: {
  result:
    | SimulateCupResult
    | SimulateContinentalResult
    | SimulateNationalTeamResult;
  notParticipatedMessage?: string;
}) {
  return (
    <div className="cup-result">
      <p className="cup-final">
        🏆 <strong>{result.championName}</strong> vince la{' '}
        {result.competitionName} {result.seasonLabel}
        {result.runnerUpName && ` battendo ${result.runnerUpName} in finale`}.
      </p>
      {result.protagonist.participated ? (
        <div className="cup-path">
          {result.protagonist.isChampion && (
            <span className="chip tone-good">Hai vinto la coppa!</span>
          )}
          <ol className="cup-path-list">
            {result.protagonist.path.map((step, i) => (
              <li
                key={i}
                className={`cup-step ${step.won ? 'tone-good' : 'tone-bad'}`}
              >
                <span className="cup-step-round">{step.roundLabel}</span>
                <span>
                  {step.won ? 'Vinto' : 'Perso'} vs {step.opponentName}
                  {step.penalties ? ' (rigori)' : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="empty">{notParticipatedMessage}</p>
      )}
    </div>
  );
}

export function CupsPage({ saveId }: CupsPageProps) {
  const queryClient = useQueryClient();
  const close = useGameStore((s) => s.closeOverlay);
  const [results, setResults] = useState<Record<string, SimulateCupResult>>({});
  const [continentalResult, setContinentalResult] =
    useState<SimulateContinentalResult | null>(null);
  const [nationalTeamResult, setNationalTeamResult] =
    useState<SimulateNationalTeamResult | null>(null);
  const [awardsResult, setAwardsResult] = useState<SeasonAwardsResult | null>(
    null,
  );
  const [awardsError, setAwardsError] = useState<string | null>(null);

  const cupsQuery = useQuery({
    queryKey: ['cups', saveId],
    queryFn: () => api.listCups(saveId),
  });

  const continentalQuery = useQuery({
    queryKey: ['continental', saveId],
    queryFn: () => api.getContinental(saveId),
  });

  const nationalTeamQuery = useQuery({
    queryKey: ['national-team', saveId],
    queryFn: () => api.getNationalTeam(saveId),
  });

  const honoursQuery = useQuery({
    queryKey: ['honours', saveId],
    queryFn: () => api.listHonours(saveId),
  });

  const simulateMutation = useMutation({
    mutationFn: (competitionId: string) =>
      api.simulateCup(saveId, competitionId),
    onSuccess: async (result, competitionId) => {
      setResults((prev) => ({ ...prev, [competitionId]: result }));
      await queryClient.invalidateQueries({ queryKey: ['cups', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['honours', saveId] });
    },
  });

  const simulateContinentalMutation = useMutation({
    mutationFn: () => api.simulateContinental(saveId),
    onSuccess: async (result) => {
      setContinentalResult(result);
      await queryClient.invalidateQueries({
        queryKey: ['continental', saveId],
      });
      await queryClient.invalidateQueries({ queryKey: ['honours', saveId] });
    },
  });

  const simulateNationalTeamMutation = useMutation({
    mutationFn: () => api.simulateNationalTeam(saveId),
    onSuccess: async (result) => {
      setNationalTeamResult(result);
      await queryClient.invalidateQueries({
        queryKey: ['national-team', saveId],
      });
      await queryClient.invalidateQueries({ queryKey: ['honours', saveId] });
    },
  });

  const assignAwardsMutation = useMutation({
    mutationFn: () => api.assignSeasonAwards(saveId),
    onSuccess: async (result) => {
      setAwardsResult(result);
      setAwardsError(null);
      await queryClient.invalidateQueries({ queryKey: ['honours', saveId] });
    },
    onError: () => {
      setAwardsError(
        'Nessuna stagione di campionato ancora completata per assegnare i premi.',
      );
    },
  });

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={close}>
          ← Indietro
        </button>
        <strong>Coppe</strong>
        <WalletBar saveId={saveId} />
      </div>

      <section className="card">
        <h2>Competizione europea</h2>
        {continentalQuery.isLoading && <p className="empty">Caricamento…</p>}
        {continentalQuery.data === null && (
          <p className="empty">
            Nessuna competizione europea disponibile in questo mondo.
          </p>
        )}
        {continentalQuery.data && (
          <div className="cup-row">
            <div className="cup-head">
              <div className="cup-info">
                <strong>{continentalQuery.data.name}</strong>
                <span className="cup-holder">
                  {continentalQuery.data.holderClubName
                    ? `Detentore: ${continentalQuery.data.holderClubName} (${continentalQuery.data.holderSeasonLabel})`
                    : 'Nessun detentore ancora'}
                </span>
              </div>
              <button
                type="button"
                disabled={simulateContinentalMutation.isPending}
                onClick={() => simulateContinentalMutation.mutate()}
              >
                Simula stagione
              </button>
            </div>
            {continentalResult && (
              <KnockoutResultView result={continentalResult} />
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Nazionali</h2>
        {nationalTeamQuery.isLoading && <p className="empty">Caricamento…</p>}
        {nationalTeamQuery.data === null && (
          <p className="empty">
            Nessun torneo per nazionali disponibile in questo mondo.
          </p>
        )}
        {nationalTeamQuery.data && (
          <div className="cup-row">
            <div className="cup-head">
              <div className="cup-info">
                <strong>{nationalTeamQuery.data.name}</strong>
                <span className="cup-holder">
                  {nationalTeamQuery.data.holderCountryName
                    ? `Detentore: ${nationalTeamQuery.data.holderCountryName} (${nationalTeamQuery.data.holderSeasonLabel})`
                    : 'Nessun detentore ancora'}
                </span>
              </div>
              <button
                type="button"
                disabled={simulateNationalTeamMutation.isPending}
                onClick={() => simulateNationalTeamMutation.mutate()}
              >
                Simula torneo
              </button>
            </div>
            {nationalTeamResult && (
              <KnockoutResultView
                result={nationalTeamResult}
                notParticipatedMessage="Non sei stato convocato in nazionale per questa edizione."
              />
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Coppe nazionali</h2>
        {cupsQuery.isLoading && <p className="empty">Caricamento…</p>}
        {cupsQuery.data && cupsQuery.data.length === 0 && (
          <p className="empty">Nessuna coppa disponibile in questo mondo.</p>
        )}
        <ul className="cup-list">
          {cupsQuery.data?.map((cup) => {
            const result = results[cup.competitionId];
            return (
              <li key={cup.competitionId} className="cup-row">
                <div className="cup-head">
                  <div className="cup-info">
                    <strong>{cup.name}</strong>
                    <span className="cup-holder">
                      {cup.holderClubName
                        ? `Detentore: ${cup.holderClubName} (${cup.holderSeasonLabel})`
                        : 'Nessun detentore ancora'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={simulateMutation.isPending}
                    onClick={() => simulateMutation.mutate(cup.competitionId)}
                  >
                    Simula stagione
                  </button>
                </div>

                {result && <KnockoutResultView result={result} />}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2>Premi di fine stagione</h2>
        <p className="shop-intro">
          Scarpa d&apos;Oro e Pallone d&apos;Oro del tuo campionato, calcolati
          sull&apos;ultima stagione completata.
        </p>
        <button
          type="button"
          disabled={assignAwardsMutation.isPending}
          onClick={() => assignAwardsMutation.mutate()}
        >
          Assegna premi
        </button>
        {awardsError && <p className="empty">{awardsError}</p>}
        {awardsResult && (
          <div className="cup-result">
            <p className="cup-final">
              {awardsResult.competitionName} — {awardsResult.seasonLabel}
              {awardsResult.alreadyAwarded && ' (già assegnati)'}
              {awardsResult.leagueStrengthLabel && (
                <span className="chip chip-accent league-strength-chip">
                  {'★'.repeat(
                    Math.max(
                      1,
                      Math.round(
                        1 + (awardsResult.leagueStrength - 0.45) * 7.3,
                      ),
                    ),
                  )}{' '}
                  {awardsResult.leagueStrengthLabel}
                </span>
              )}
            </p>
            {awardsResult.goldenBoot && (
              <p>
                👟 <strong>Scarpa d&apos;Oro:</strong>{' '}
                {awardsResult.goldenBoot.playerName} (
                {awardsResult.goldenBoot.clubName}) —{' '}
                {awardsResult.goldenBoot.goals} gol
              </p>
            )}
            {awardsResult.playerOfSeason && (
              <p>
                🥇 <strong>Pallone d&apos;Oro:</strong>{' '}
                {awardsResult.playerOfSeason.playerName} (
                {awardsResult.playerOfSeason.clubName}) — media voto{' '}
                {awardsResult.playerOfSeason.averageRating.toFixed(2)}
              </p>
            )}
            {!awardsResult.ballonDorEligible && awardsResult.goldenBoot && (
              <p className="award-note">
                🌍 Il Pallone d&apos;Oro guarda altrove: da{' '}
                {awardsResult.competitionName} non si vince. Per entrare nel
                giro che conta devi salire di categoria.
              </p>
            )}
            {!awardsResult.goldenBoot && !awardsResult.playerOfSeason && (
              <p className="empty">
                Nessuna statistica disponibile per questa stagione.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Albo d&apos;oro</h2>
        {honoursQuery.isLoading && <p className="empty">Caricamento…</p>}
        {honoursQuery.data && honoursQuery.data.length === 0 && (
          <p className="empty">Nessun trofeo assegnato ancora.</p>
        )}
        <ul className="honour-list">
          {honoursQuery.data?.map((honour) => (
            <li key={honour.id} className="honour-row">
              <span className="chip">
                {honourTypeLabels[honour.type] ?? honour.type}
              </span>
              <span className="honour-competition">
                {honour.competitionName ?? ''}
              </span>
              <span className="honour-winner">
                {honour.clubName ?? honour.playerName ?? '—'}
              </span>
              <span className="honour-season">{honour.seasonLabel}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
