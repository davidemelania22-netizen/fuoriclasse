import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TrainingIntensity } from '@football-life/shared';
import {
  api,
  type AdvanceResponse,
  type AdvanceWeekBody,
  type EventOutcome,
  type SeasonSkipSummary,
} from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { PlayerCard } from '../components/PlayerCard';
import { EventCard } from '../components/EventCard';
import { WalletBar } from '../components/WalletBar';
import { ClubSelection } from '../components/ClubSelection';
import { MatchdayCard } from '../components/MatchdayCard';
import { AttributesPanel } from '../components/AttributesPanel';
import { SeasonSkipCard } from '../components/SeasonSkipCard';
import { LeagueSpotlightCard } from '../components/LeagueSpotlightCard';
import { intensityLabels, label, laCountry } from '../i18n';
import { fileToAvatarDataUrl } from '../utils/image';

interface DashboardPageProps {
  saveId: string;
}

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Lieve',
  2: 'Moderato',
  3: 'Serio',
  4: 'Grave',
  5: 'Molto grave',
};

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  ABOVE: 'Sopra le aspettative',
  ON_TRACK: 'In linea',
  BELOW: 'Sotto le aspettative',
  PENDING: 'Stagione da iniziare',
};

const TONE_LABELS: Record<string, string> = {
  HUMBLE: 'Umile',
  BOLD: 'Sicuro',
  DIPLOMATIC: 'Diplomatico',
};

export function DashboardPage({ saveId }: DashboardPageProps) {
  const queryClient = useQueryClient();
  const clearSave = useGameStore((s) => s.clearSave);
  const openEditor = useGameStore((s) => s.openEditor);
  const openShop = useGameStore((s) => s.openShop);
  const openAgent = useGameStore((s) => s.openAgent);
  const openLifestyle = useGameStore((s) => s.openLifestyle);
  const openInterview = useGameStore((s) => s.openInterview);
  const openCups = useGameStore((s) => s.openCups);
  const openHistory = useGameStore((s) => s.openHistory);
  const openStandings = useGameStore((s) => s.openStandings);
  const openMatch = useGameStore((s) => s.openMatch);
  const openNews = useGameStore((s) => s.openNews);
  const openCareer = useGameStore((s) => s.openCareer);
  const openTactics = useGameStore((s) => s.openTactics);
  const openCalendar = useGameStore((s) => s.openCalendar);
  const openWorldEditor = useGameStore((s) => s.openWorldEditor);
  const [intensity, setIntensity] = useState<string>(TrainingIntensity.Normal);
  const [lastReport, setLastReport] = useState<
    AdvanceResponse['report'] | null
  >(null);
  const [lastMatches, setLastMatches] = useState<AdvanceResponse['matches']>(
    [],
  );
  const [newSeason, setNewSeason] = useState<
    AdvanceResponse['seasonRollover'] | null
  >(null);
  const [cupResults, setCupResults] = useState<AdvanceResponse['competitions']>(
    [],
  );
  const [lastTrust, setLastTrust] = useState<
    AdvanceResponse['managerTrust'] | null
  >(null);
  const [seasonSkip, setSeasonSkip] = useState<SeasonSkipSummary | null>(null);
  // How the last declared-odds choice actually went.
  const [lastGamble, setLastGamble] = useState<EventOutcome['gamble']>(null);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', saveId],
    queryFn: () => api.getDashboard(saveId),
  });

  const avatarQuery = useQuery({
    queryKey: ['avatar', saveId],
    queryFn: () => api.getAvatar(saveId),
  });

  const nextFixtureQuery = useQuery({
    queryKey: ['next-fixture', saveId],
    queryFn: () => api.getNextFixture(saveId),
  });

  const newsQuery = useQuery({
    queryKey: ['news', saveId],
    queryFn: () => api.getNews(saveId),
  });

  // Non-neutral tactical instructions become identity chips on the card.
  const tacticsQuery = useQuery({
    queryKey: ['tactics', saveId],
    queryFn: () => api.getTactics(saveId),
  });
  const tactics = tacticsQuery.data;
  const inclinations = [
    tactics?.styles.find(
      (s) => s.key === tactics.instructions.style && s.key !== 'BALANCED',
    ),
    tactics?.temperaments.find(
      (t) => t.key === tactics.instructions.temperament && t.key !== 'COMPOSED',
    ),
  ].filter((option) => option != null);

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await fileToAvatarDataUrl(file);
      return api.uploadAvatar(saveId, dataUrl);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['avatar', saveId] });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: (body: AdvanceWeekBody) => api.advanceWeek(saveId, body),
    onSuccess: async (response) => {
      setLastReport(response.report);
      setLastMatches(response.matches);
      setNewSeason(
        response.seasonRollover.rolledOver ? response.seasonRollover : null,
      );
      setCupResults(response.competitions);
      setLastTrust(response.managerTrust);
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['standings', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['cups', saveId] });
      await queryClient.invalidateQueries({
        queryKey: ['continental', saveId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['national-team', saveId],
      });
      await queryClient.invalidateQueries({ queryKey: ['honours', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['finance', saveId] });
      await queryClient.invalidateQueries({
        queryKey: ['next-fixture', saveId],
      });
      await queryClient.invalidateQueries({ queryKey: ['news', saveId] });
    },
  });

  const seasonSkipMutation = useMutation({
    mutationFn: (body: AdvanceWeekBody) => api.simulateSeason(saveId, body),
    onSuccess: async (summary) => {
      // The weekly report belongs to a single week; the season card replaces it.
      setLastReport(null);
      setLastMatches([]);
      setNewSeason(null);
      setCupResults([]);
      setLastTrust(null);
      setSeasonSkip(summary);
      await Promise.all(
        [
          'dashboard',
          'standings',
          'cups',
          'continental',
          'national-team',
          'honours',
          'finance',
          'next-fixture',
          'news',
          'season-stats',
          'career-timeline',
          'calendar',
          'tactics',
        ].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key, saveId] }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const chooseMutation = useMutation({
    mutationFn: ({
      eventId,
      choiceKey,
    }: {
      eventId: string;
      choiceKey: string;
    }) => api.chooseEvent(saveId, eventId, choiceKey),
    onSuccess: async (outcome) => {
      // Only a gamble has something to report: a sure choice already told the
      // player exactly what it would do.
      setLastGamble(outcome.gamble);
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['finance', saveId] });
    },
  });

  const treatmentMutation = useMutation({
    mutationFn: (choice: 'REST' | 'RUSH') =>
      api.chooseInjuryTreatment(saveId, choice),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
    },
  });

  const callupMutation = useMutation({
    mutationFn: (accept: boolean) => api.decideCallup(saveId, accept),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
    },
  });

  const naturalizationMutation = useMutation({
    mutationFn: (accept: boolean) => api.decideNaturalization(saveId, accept),
    onSuccess: async () => {
      await Promise.all(
        ['dashboard', 'news'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key, saveId] }),
        ),
      );
    },
  });

  const loanMutation = useMutation({
    mutationFn: ({ accept, clubId }: { accept: boolean; clubId?: string }) =>
      api.decideLoan(saveId, accept, clubId),
    onSuccess: async () => {
      await Promise.all(
        ['dashboard', 'next-fixture', 'tactics', 'calendar', 'standings'].map(
          (key) => queryClient.invalidateQueries({ queryKey: [key, saveId] }),
        ),
      );
    },
  });

  const postMatchMutation = useMutation({
    mutationFn: (answerKey: string) => api.answerPostMatch(saveId, answerKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
    },
  });

  if (dashboardQuery.isLoading) {
    return <p className="page">Caricamento carriera…</p>;
  }
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="page">
        <p className="error">Impossibile caricare questa carriera.</p>
        <button type="button" onClick={clearSave}>
          Indietro
        </button>
      </div>
    );
  }

  const {
    save,
    player,
    pendingEvents,
    activeInjury,
    managerStatus,
    postMatch,
    scoutWatchers,
    nationalCallup,
    loanOffer,
    activeLoan,
    leagueSpotlight,
    naturalization,
  } = dashboardQuery.data;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={clearSave}>
          ← Salvataggi
        </button>
        <strong>{save.name}</strong>
        <WalletBar saveId={saveId} />
        <button type="button" className="ghost" onClick={openAgent}>
          🤝 Procuratore
        </button>
        <button type="button" className="ghost" onClick={openInterview}>
          🎤 Interviste
        </button>
        <button type="button" className="ghost" onClick={openCups}>
          🏆 Coppe
        </button>
        <button type="button" className="ghost" onClick={openStandings}>
          📊 Classifiche
        </button>
        <button type="button" className="ghost news-button" onClick={openNews}>
          📰 Notizie
          {(newsQuery.data?.unread ?? 0) > 0 && (
            <span className="news-badge">{newsQuery.data?.unread}</span>
          )}
        </button>
        <button type="button" className="ghost" onClick={openCareer}>
          📈 Carriera
        </button>
        <button type="button" className="ghost" onClick={openTactics}>
          📋 Tattica
        </button>
        <button type="button" className="ghost" onClick={openCalendar}>
          📅 Calendario
        </button>
        <button type="button" className="ghost" onClick={openHistory}>
          📖 Storia
        </button>
        <button type="button" className="ghost" onClick={openLifestyle}>
          🌟 Stile di vita
        </button>
        <button type="button" className="ghost" onClick={openShop}>
          🛒 Negozio
        </button>
        <button type="button" className="ghost" onClick={openWorldEditor}>
          🏟️ Mondo
        </button>
        <button type="button" className="ghost" onClick={openEditor}>
          Modifica
        </button>
      </div>

      {player.clubId === null && <ClubSelection saveId={saveId} />}

      <div className="dashboard">
        <div className="dashboard-side">
          <PlayerCard
            player={player}
            save={save}
            avatarUrl={avatarQuery.data?.avatarDataUrl}
            onUploadAvatar={(file) => avatarMutation.mutate(file)}
            avatarUploading={avatarMutation.isPending}
            inclinations={inclinations}
          />
          <AttributesPanel saveId={saveId} />
        </div>

        <div className="dashboard-main">
          <section className="card">
            <h2>Settimana</h2>
            <div className="controls">
              <label>
                Allenamento
                <select
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value)}
                >
                  {Object.values(TrainingIntensity).map((value) => (
                    <option key={value} value={value}>
                      {label(intensityLabels, value)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={advanceMutation.isPending || seasonSkipMutation.isPending}
                onClick={() =>
                  advanceMutation.mutate({
                    weeks: 1,
                    intensity: intensity as never,
                  })
                }
              >
                {advanceMutation.isPending
                  ? 'Avanzamento…'
                  : 'Avanza settimana'}
              </button>
              {player.clubId !== null && (
                <button
                  type="button"
                  className="ghost season-skip-button"
                  disabled={
                    advanceMutation.isPending || seasonSkipMutation.isPending
                  }
                  title="Gioca tutte le partite che restano e vai ai titoli di coda della stagione"
                  onClick={() =>
                    seasonSkipMutation.mutate({
                      intensity: intensity as never,
                    })
                  }
                >
                  {seasonSkipMutation.isPending
                    ? 'Simulazione stagione…'
                    : '⏩ Salta a fine stagione'}
                </button>
              )}
            </div>
            {seasonSkipMutation.isError && (
              <p className="error">
                Impossibile simulare la stagione. Riprova.
              </p>
            )}
            {lastReport && (
              <p className="report">
                Abilità {lastReport.abilityBefore.toFixed(1)} →{' '}
                {lastReport.abilityAfter.toFixed(1)} · stanchezza{' '}
                {Math.round(lastReport.fatigue)} ·{' '}
                {lastReport.injured ? 'infortunato' : 'in forma'}
                {lastReport.injuriesSustained > 0 &&
                  (lastReport.injuryRelapse
                    ? ' · ricaduta sul vecchio infortunio!'
                    : ` · ${lastReport.injuriesSustained} nuovo infortunio`)}
              </p>
            )}
          </section>

          {seasonSkip && (
            <SeasonSkipCard
              summary={seasonSkip}
              onDismiss={() => setSeasonSkip(null)}
            />
          )}

          {newSeason && (
            <section className="card season-banner">
              <h2>🎉 Nuova stagione {newSeason.newSeasonLabel}</h2>
              <p>
                Il campionato riparte da zero.
                {newSeason.promotedCount > 0
                  ? ` ${newSeason.promotedCount} promosse e ${newSeason.relegatedCount} retrocesse cambiano categoria.`
                  : ' Il calendario è stato rigenerato.'}{' '}
                Controlla le nuove classifiche.
              </p>
              {newSeason.retiredCount > 0 && (
                <p className="season-aging">
                  🎓 {newSeason.retiredCount}{' '}
                  {newSeason.retiredCount === 1
                    ? 'giocatore si è ritirato'
                    : 'giocatori si sono ritirati'}{' '}
                  e {newSeason.newcomerCount}{' '}
                  {newSeason.newcomerCount === 1
                    ? 'giovane debutta'
                    : 'giovani debuttano'}{' '}
                  dai vivai.
                </p>
              )}
              {newSeason.youthIntakeCount > 0 && (
                <p className="season-aging">
                  🌱 Intake day: le accademie promuovono{' '}
                  {newSeason.youthIntakeCount} nuovi talenti in prima squadra
                  — dettagli nelle Notizie.
                </p>
              )}
            </section>
          )}

          {cupResults.length > 0 && (
            <section className="card cup-results">
              <h2>🏆 Trofei della stagione</h2>
              <ul className="cup-results-list">
                {cupResults.map((cup, i) => (
                  <li
                    key={i}
                    className={
                      cup.protagonistIsChampion ? 'cup-result-won' : undefined
                    }
                  >
                    <strong>{cup.competitionName}</strong>: {cup.championName}
                    {cup.protagonistIsChampion
                      ? ' 🎉 (la tua squadra!)'
                      : cup.protagonistParticipated
                        ? ' · hai partecipato'
                        : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {player.careerStatus === 'RETIRED' && (
            <section className="card legacy-banner">
              <h2>🏛 Carriera conclusa</h2>
              <p>
                Hai appeso gli scarpini al chiodo. È il momento di scoprire
                cosa lasci al calcio.
              </p>
              <button type="button" onClick={openCareer}>
                Vedi la tua eredità
              </button>
            </section>
          )}

          {postMatch && (
            <section className="card postmatch-card">
              <h2>🎙 Intervista a caldo</h2>
              <p className="postmatch-context">
                {postMatch.resultLine} · Un cronista ti ferma nel tunnel:
              </p>
              <p className="postmatch-prompt">{postMatch.question.prompt}</p>
              <div className="postmatch-answers">
                {postMatch.question.answers.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className="postmatch-answer ghost"
                    disabled={postMatchMutation.isPending}
                    onClick={() => postMatchMutation.mutate(a.key)}
                  >
                    <span className="interview-tone">
                      {TONE_LABELS[a.tone] ?? a.tone}
                    </span>
                    {a.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {nextFixtureQuery.data && (
            <section className="card next-fixture-card">
              <h2>
                ⚽ Prossima partita
                {nextFixtureQuery.data.isDerby && (
                  <span className="derby-badge">DERBY</span>
                )}
              </h2>
              <p className="next-fixture-line">
                {nextFixtureQuery.data.isHome
                  ? `In casa contro ${nextFixtureQuery.data.opponentName}`
                  : `In trasferta contro ${nextFixtureQuery.data.opponentName}`}{' '}
                · {nextFixtureQuery.data.competitionName} ·{' '}
                {nextFixtureQuery.data.date.slice(0, 10)}
              </p>
              <button type="button" onClick={openMatch}>
                {nextFixtureQuery.data.plannedApproach
                  ? 'Modifica il piano partita'
                  : 'Prepara la partita'}
              </button>
            </section>
          )}

          {managerStatus && (
            <section className="card manager-card">
              <h2>🎯 Il mister</h2>
              <div className="manager-trust">
                <div className="manager-trust-head">
                  <span>Fiducia del mister</span>
                  <span className="manager-role">
                    {managerStatus.role.label}
                  </span>
                </div>
                <div className="manager-bar">
                  <div
                    className="manager-bar-fill"
                    style={{ width: `${managerStatus.trust}%` }}
                  />
                </div>
                {lastTrust && lastTrust.delta !== 0 && (
                  <p
                    className={
                      lastTrust.delta > 0
                        ? 'manager-delta up'
                        : 'manager-delta down'
                    }
                  >
                    {lastTrust.delta > 0 ? '▲' : '▼'} La fiducia del mister è{' '}
                    {lastTrust.delta > 0 ? 'salita' : 'scesa'} di{' '}
                    {Math.abs(lastTrust.delta)}{' '}
                    {Math.abs(lastTrust.delta) === 1 ? 'punto' : 'punti'}.
                  </p>
                )}
              </div>
              <div className="manager-objective">
                <div className="manager-objective-head">
                  <span className="manager-objective-label">
                    Obiettivo di stagione
                  </span>
                  <span
                    className={`chip objective-${managerStatus.objective.status.toLowerCase()}`}
                  >
                    {OBJECTIVE_STATUS_LABELS[managerStatus.objective.status]}
                  </span>
                </div>
                <p className="manager-objective-text">
                  {managerStatus.objective.text}
                </p>
                {managerStatus.objective.currentPosition !== null && (
                  <p className="manager-objective-pos">
                    Posizione attuale: {managerStatus.objective.currentPosition}ª
                    · attesa: {managerStatus.objective.targetPosition}ª
                  </p>
                )}
              </div>
            </section>
          )}

          {naturalization && (
            <section className="card naturalization-card">
              <h2>🛂 Naturalizzazione</h2>
              <p className="callup-status">
                La federazione <strong>{naturalization.countryName}</strong> ti
                offre il passaporto: hai giocato qui abbastanza per essere uno
                dei loro. Se accetti, lasci per sempre{' '}
                {laCountry(naturalization.previousCountryName)} e le
                convocazioni arriveranno da loro.
              </p>
              <p className="naturalization-warning">
                ⚠️ È una scelta definitiva, in un verso e nell&apos;altro: si
                cambia nazionale una volta sola.
              </p>
              <div className="controls">
                <button
                  type="button"
                  disabled={naturalizationMutation.isPending}
                  onClick={() => naturalizationMutation.mutate(true)}
                >
                  Accetta il passaporto {naturalization.countryName}
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={naturalizationMutation.isPending}
                  onClick={() => naturalizationMutation.mutate(false)}
                >
                  Resta {naturalization.previousCountryName}
                </button>
              </div>
            </section>
          )}

          {leagueSpotlight && (
            <LeagueSpotlightCard spotlight={leagueSpotlight} />
          )}

          {activeLoan && (
            <section className="card loan-active">
              <h2>🔁 In prestito</h2>
              <p className="callup-status">
                Giochi nel <strong>{activeLoan.loanClubName}</strong>, ma il
                cartellino resta al {activeLoan.parentClubName}. A fine stagione
                torni alla base: falli pentire di averti lasciato partire.
              </p>
            </section>
          )}

          {loanOffer && (
            <section className="card loan-card">
              <h2>🔁 Proposta di prestito</h2>
              <p className="callup-status">
                Il {loanOffer.parentClubName} non ti sta dando spazio e apre al
                prestito: una stagione altrove per giocare davvero. Il contratto
                resta dov&apos;è, torni a fine anno.
              </p>
              <div className="loan-options">
                {loanOffer.options.map((option) => (
                  <button
                    key={option.clubId}
                    type="button"
                    className="loan-option"
                    disabled={loanMutation.isPending}
                    onClick={() =>
                      loanMutation.mutate({
                        accept: true,
                        clubId: option.clubId,
                      })
                    }
                  >
                    <span className="loan-club">{option.clubName}</span>
                    <span className="loan-meta">
                      {option.competitionName} · reputazione{' '}
                      {option.reputation}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ghost"
                disabled={loanMutation.isPending}
                onClick={() => loanMutation.mutate({ accept: false })}
              >
                Resto qui e mi gioco il posto
              </button>
            </section>
          )}

          {nationalCallup && (
            <section className="card callup-card">
              <h2>🏅 Nazionale</h2>
              {nationalCallup.status === 'PENDING' && (
                <>
                  <p className="callup-status">
                    Il CT della {nationalCallup.countryName} ti ha inserito
                    nella lista provvisoria per gli{' '}
                    {nationalCallup.competitionName}. Rispondi alla
                    convocazione.
                  </p>
                  <div className="controls">
                    <button
                      type="button"
                      disabled={callupMutation.isPending}
                      onClick={() => callupMutation.mutate(true)}
                    >
                      Accetta la convocazione
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={callupMutation.isPending}
                      onClick={() => callupMutation.mutate(false)}
                    >
                      Rinuncia
                    </button>
                  </div>
                </>
              )}
              {nationalCallup.status === 'ACCEPTED' && (
                <p className="callup-status">
                  ✅ Sei tra i convocati della {nationalCallup.countryName} per
                  gli {nationalCallup.competitionName}. In bocca al lupo!
                </p>
              )}
              {nationalCallup.status === 'DECLINED' && (
                <p className="callup-status">
                  Hai rinunciato alla convocazione per gli{' '}
                  {nationalCallup.competitionName}: riposo per il club, ma il
                  CT non dimentica.
                </p>
              )}
            </section>
          )}

          {scoutWatchers.length > 0 && (
            <section className="card scout-card">
              <h2>🔭 Osservatori</h2>
              <p className="scout-intro">
                Club che ti stanno seguendo: continua a brillare quando sono
                in tribuna.
              </p>
              <ul className="scout-list">
                {scoutWatchers.map((w) => (
                  <li key={w.clubName} className="scout-row">
                    <span className="scout-club">{w.clubName}</span>
                    <div className="scout-bar">
                      <div
                        className="scout-bar-fill"
                        style={{ width: `${w.interest}%` }}
                      />
                    </div>
                    <span className="scout-value">{w.interest}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeInjury && (
            <section className="card injury-card">
              <h2>🩹 Infortunio</h2>
              <p>
                {activeInjury.typeName}
                {activeInjury.bodyArea && ` (${activeInjury.bodyArea})`} ·{' '}
                {SEVERITY_LABELS[activeInjury.severity] ?? 'Sconosciuto'} ·
                rientro previsto tra {activeInjury.weeksRemaining}{' '}
                {activeInjury.weeksRemaining === 1 ? 'settimana' : 'settimane'}
              </p>
              {activeInjury.treatmentChoice ? (
                <p className="injury-plan">
                  Piano di recupero:{' '}
                  {activeInjury.treatmentChoice === 'RUSH'
                    ? 'rientro forzato'
                    : 'riposo completo'}{' '}
                  · rischio di ricaduta{' '}
                  {Math.round(activeInjury.recurrenceRisk * 100)}%
                </p>
              ) : (
                <div className="controls">
                  <button
                    type="button"
                    disabled={treatmentMutation.isPending}
                    onClick={() => treatmentMutation.mutate('REST')}
                  >
                    Riposo completo
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    disabled={treatmentMutation.isPending}
                    onClick={() => treatmentMutation.mutate('RUSH')}
                  >
                    Rientro forzato
                  </button>
                </div>
              )}
            </section>
          )}

          {lastMatches.map((match, i) => (
            <MatchdayCard key={i} match={match} />
          ))}

          <section className="card">
            <h2>Eventi</h2>
            {lastGamble && (
              <p
                className={`gamble-outcome ${lastGamble.succeeded ? 'won' : 'lost'}`}
              >
                {lastGamble.succeeded ? '✅' : '❌'} {lastGamble.outcomeLabel}
              </p>
            )}
            {pendingEvents.length === 0 ? (
              <p className="empty">Nessuna decisione in sospeso.</p>
            ) : (
              <div className="events">
                {pendingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    disabled={chooseMutation.isPending}
                    onChoose={(eventId, choiceKey) =>
                      chooseMutation.mutate({ eventId, choiceKey })
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
