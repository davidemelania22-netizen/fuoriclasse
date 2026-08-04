import type {
  Agent,
  AgentRequestType,
  EditablePlayer,
  InterviewSessionQuestion,
  Lifestyle,
  LoadedGame,
  NewGameInput,
  PlayerEditInput,
  PlayerSummary,
  QuickStartDefinition,
  SaveGameSummary,
  ShopItem,
  TrainingIntensity,
} from '@football-life/shared';

const BASE = '/api';

/** A trophy being lifted — mirrors the server's AwardCeremony. */
export interface AwardCeremony {
  honourId: string;
  type: string;
  label: string;
  isPersonal: boolean;
  competitionName: string | null;
  seasonLabel: string;
  clubName: string | null;
  colors: { primary: string; secondary: string; onDark: string };
  playerName: string;
  avatarDataUrl: string | null;
  careerTotal: number;
}

/** The unveiling at a new club — mirrors the server's ClubPresentation. */
export interface ClubPresentation {
  /** SIGNING = unveiled at a new club. RENEWAL = signing to stay. */
  kind: 'SIGNING' | 'RENEWAL';
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  competitionName: string | null;
  colors: {
    primary: string;
    secondary: string;
    onPrimary: string;
    onDark: string;
  };
  playerName: string;
  avatarDataUrl: string | null;
  weeklyWage: number;
  squadRole: string;
  contractYears: number;
  year: number;
  shirtName: string;
  shirtNumber: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = { ...init };
  if (init?.body) {
    requestInit.headers = {
      'Content-Type': 'application/json',
      ...init.headers,
    };
  }
  const response = await fetch(`${BASE}${path}`, requestInit);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(response.status, body?.error ?? response.statusText);
  }
  return (await response.json()) as T;
}

export interface ClubDirectoryEntry {
  clubId: string;
  name: string;
  shortName: string;
  logo: string | null;
  reputation: number;
  strength: number;
  competitionName: string | null;
  countryId: string;
}

export interface ProtagonistOfferView {
  id: string;
  clubName: string;
  clubReputation: number;
  fee: number;
  weeklyWage: number;
  contractYears: number;
  squadRole: string;
}

export interface SignResult {
  clubId: string;
  weeklyWage: number;
  signingBonus: number;
  squadRole: string;
  endDate: string;
  balance: number | null;
}

/** Signed deltas a choice applies. All fields optional; 0 means "untouched". */
export interface EventConsequenceView {
  morale?: number;
  stress?: number;
  happiness?: number;
  mentalHealth?: number;
  motivation?: number;
  reputation?: number;
  popularity?: number;
  money?: number;
}

/** A choice whose odds are declared before the player commits to it. */
export interface EventGambleView {
  successChance: number;
  successLabel: string;
  failureLabel: string;
  success: EventConsequenceView;
  failure: EventConsequenceView;
}

export interface EventChoiceView {
  key: string;
  label: string;
  consequences: EventConsequenceView;
  gamble?: EventGambleView;
}

export interface PendingEventView {
  id: string;
  definitionKey: string;
  category: string;
  title: string;
  description: string;
  choices: EventChoiceView[];
}

export interface EventOutcome {
  morale: number;
  stress: number;
  reputation: number;
  moneyDelta: number;
  gamble: { succeeded: boolean; outcomeLabel: string } | null;
}

export interface ActiveInjuryView {
  id: string;
  typeKey: string;
  typeName: string;
  bodyArea: string | null;
  weeksRemaining: number;
  severity: number;
  recurrenceRisk: number;
  treatmentChoice: string | null;
}

export interface EffectiveRole {
  key: string;
  label: string;
}

export interface SeasonObjective {
  tier: 'TITLE' | 'EUROPE' | 'MIDTABLE' | 'SURVIVAL';
  text: string;
  targetPosition: number;
  currentPosition: number | null;
  status: 'ABOVE' | 'ON_TRACK' | 'BELOW' | 'PENDING';
}

export interface ManagerStatus {
  trust: number;
  role: EffectiveRole;
  contractRole: string | null;
  clubName: string;
  objective: SeasonObjective;
}

export interface ManagerTrustChange {
  value: number;
  before: number;
  delta: number;
  role: EffectiveRole;
}

/** How much the league the player is in is worth, and what it changes. */
export interface LeagueSpotlight {
  competitionName: string;
  strength: number;
  label: string;
  stars: number;
  growthModifier: number;
  scoutAttention: number;
}

/** One attribute on the 0-20 scale the profile screen speaks. */
export interface ProfileAttributeView {
  key: string;
  category: string;
  value: number;
  isKey: boolean;
}

export interface ProfileSeasonLine {
  competitionName: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating: number;
}

export interface ProfileRecentMatch {
  date: string;
  opponentName: string;
  competitionName: string | null;
  rating: number;
  goals: number;
  assists: number;
}

/** The scouting report on yourself. */
export interface PlayerProfileView {
  playerName: string;
  shirtNumber: number;
  positionLabel: string;
  secondaryPositionLabels: string[];
  footLabel: string;
  footStrength: { left: number; right: number };
  nationalityId: string;
  ageYears: number;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  avatarDataUrl: string | null;
  clubName: string | null;
  clubLogo: string | null;
  colors: {
    primary: string;
    secondary: string;
    onPrimary: string;
    onDark: string;
  };
  squadRoleLabel: string | null;
  weeklyWage: number | null;
  contractEndDate: string | null;
  marketValue: number;
  abilityStars: number;
  potentialStars: number;
  reputationLabel: string;
  personalityLabel: string;
  keeperRating: number;
  attributes: ProfileAttributeView[];
  setPieceKeys: string[];
  roles: { key: string; label: string; stars: number; natural: boolean }[];
  traits: { key: string; label: string }[];
  morale: number;
  condition: number;
  form: number;
  stress: number;
  seasonLabel: string | null;
  seasonLines: ProfileSeasonLine[];
  recentMatches: ProfileRecentMatch[];
  careerTotals: {
    appearances: number;
    goals: number;
    assists: number;
    clubs: number;
  };
}

/** Settings the server acts on: only autosave, for now. */
export interface ServerSettings {
  autoSaveEnabled: boolean;
  autoSaveEveryWeeks: number;
  autoSaveKeep: number;
}

export interface AutoSaveInterval {
  weeks: number;
  label: string;
}

export interface SnapshotView {
  name: string;
  createdAt: string;
  sizeBytes: number;
  automatic: boolean;
}

/** One offer, with how it compares to the deal already in hand. */
export interface MarketOfferView {
  id: string;
  clubName: string;
  clubLogo: string | null;
  clubReputation: number;
  competitionName: string | null;
  fee: number;
  weeklyWage: number;
  contractYears: number;
  squadRole: string;
  squadRoleLabel: string;
  wageDelta: number | null;
  roleDelta: number | null;
  reputationDelta: number | null;
  canNegotiate: boolean;
}

export interface WorldTransferRecord {
  date: string;
  headline: string;
  body: string;
}

export interface MarketView {
  window: {
    isOpen: boolean;
    kind: string;
    label: string;
    daysAway: number;
    opensAt: string;
    closesAt: string;
  };
  current: {
    clubName: string | null;
    weeklyWage: number | null;
    squadRoleLabel: string | null;
    contractEnd: string | null;
    marketValue: number;
  };
  offers: MarketOfferView[];
  worldTransfers: WorldTransferRecord[];
}

export type NegotiationAsk = 'WAGE' | 'ROLE';

export interface NegotiationPreview {
  successChance: number;
  successLabel: string;
  failureLabel: string;
}

export interface NegotiationOutcome {
  succeeded: boolean;
  weeklyWage: number;
  squadRole: string;
  squadRoleLabel: string;
}

/** Every term of a contract, the thing that gets argued over. */
export interface ContractPackage {
  years: number;
  weeklyWage: number;
  signingBonus: number;
  appearanceBonus: number;
  goalBonus: number;
  squadRole: string;
}

export interface TalksView {
  subject: string;
  baseline: ContractPackage;
  clubPosition: ContractPackage;
  patience: number;
  round: number;
  status: 'OPEN' | 'AGREED' | 'BROKEN';
  lastVerdict: string | null;
  lastMessage: string | null;
  clubName: string;
  squadRoleLabel: string;
  limits: Record<
    'years' | 'weeklyWage' | 'signingBonus' | 'appearanceBonus' | 'goalBonus',
    { min: number; max: number }
  >;
  isOpen: boolean;
}

export interface ProposalResult extends TalksView {
  verdict: 'ACCEPT' | 'COUNTER' | 'REJECT' | 'WALKED_OUT';
  message: string;
}

/** The club declining to sit down at all, with its reason in words. */
export interface TalksRefusal {
  reason: 'COOLING_OFF' | 'JUST_SIGNED' | 'NOT_EARNED';
  message: string;
}

/** One line of the ledger: where a movement came from. */
export interface LedgerEntry {
  occurredAt: string;
  type: string;
  description: string;
  amount: number;
}

export interface DashboardResponse {
  save: SaveGameSummary;
  player: PlayerSummary;
  pendingEvents: PendingEventView[];
  activeInjury: ActiveInjuryView | null;
  managerStatus: ManagerStatus | null;
  postMatch: PostMatchSession | null;
  scoutWatchers: ScoutWatcher[];
  nationalCallup: NationalCallup | null;
  loanOffer: LoanOffer | null;
  activeLoan: ActiveLoan | null;
  leagueSpotlight: LeagueSpotlight | null;
  naturalization: NaturalizationOffer | null;
}

/** A federation offering its passport — and its national team. */
export interface NaturalizationOffer {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  countryId: string;
  countryName: string;
  previousCountryId: string;
  previousCountryName: string;
  seasonLabel: string;
}

export interface InjuryTreatmentResult {
  weeksRemaining: number;
  recurrenceRisk: number;
}

export interface WeeklyAdvanceReport {
  weeksAdvanced: number;
  seasonsCrossed: number;
  ageAfter: number;
  abilityBefore: number;
  abilityAfter: number;
  fatigue: number;
  condition: number;
  morale: number;
  stress: number;
  injured: boolean;
  injuriesSustained: number;
  injuryRelapse: boolean;
  newCurrentDate: string;
}

export interface GeneratedEvent {
  gameEventId: string;
  definitionId: string;
  title: string;
  description: string;
  choices: { key: string; label: string }[];
}

export interface TabellinoEntry {
  minute: number;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD';
  clubId: string;
  clubName: string;
  playerName: string;
  assistPlayerName: string | null;
}

export interface LineupEntry {
  playerId: string;
  playerName: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  isProtagonist: boolean;
}

export interface Pagella {
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  comment: string;
}

export type MatchApproach = 'DEFENSIVE' | 'BALANCED' | 'ATTACKING';

export interface KeyMomentResult {
  momentId: string;
  prompt: string;
  choiceLabel: string;
  success: boolean;
  text: string;
}

export interface KeyMomentPrompt {
  id: string;
  prompt: string;
  options: { key: string; label: string }[];
}

export interface MatchApproachOption {
  key: MatchApproach;
  label: string;
  description: string;
}

export interface NextFixtureView {
  fixtureId: string;
  opponentName: string;
  isHome: boolean;
  date: string;
  competitionName: string;
  isDerby: boolean;
  approaches: MatchApproachOption[];
  moments: KeyMomentPrompt[];
  plannedApproach: MatchApproach | null;
  plannedChoices: Record<string, string>;
}

export interface MatchdayReport {
  date: string;
  competitionName: string;
  homeClubName: string;
  awayClubName: string;
  homeGoals: number;
  awayGoals: number;
  isHome: boolean;
  isDerby: boolean;
  approach: MatchApproach | null;
  keyMoments: KeyMomentResult[];
  tabellino: TabellinoEntry[];
  liveFeed: string[];
  homeLineup: LineupEntry[];
  awayLineup: LineupEntry[];
  pagella: Pagella | null;
}

export interface SeasonRolloverResult {
  rolledOver: boolean;
  newSeasonLabel: string | null;
  promotedCount: number;
  relegatedCount: number;
  retiredCount: number;
  newcomerCount: number;
  youthIntakeCount: number;
}

export interface ResolvedCompetition {
  type: string;
  competitionName: string;
  championName: string;
  protagonistParticipated: boolean;
  protagonistIsChampion: boolean;
}

export interface AdvanceResponse {
  report: WeeklyAdvanceReport;
  event: GeneratedEvent | null;
  matches: MatchdayReport[];
  seasonRollover: SeasonRolloverResult;
  competitions: ResolvedCompetition[];
  managerTrust: ManagerTrustChange | null;
  unreadNews: number;
  postMatch: PostMatchSession | null;
  scouting: ScoutingWeek | null;
  /** What the week paid, or null when there is no contract to pay it. */
  payslip: PayslipView | null;
}

/** The week's earnings, itemised the way a payslip is. */
export interface PayslipView {
  lines: { kind: string; label: string; units: number; amount: number }[];
  total: number;
  balance: number;
}

export interface NewsItemRecord {
  id: string;
  gameDate: string;
  category:
    | 'TRANSFER'
    | 'SEASON'
    | 'PROTAGONIST'
    | 'SACKING'
    | 'SCOUT'
    | 'YOUTH'
    | 'NATIONAL';
  headline: string;
  body: string;
  isRead: boolean;
}

export interface NationalCallup {
  seasonLabel: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  competitionName: string;
  countryName: string;
}

export interface LoanOption {
  clubId: string;
  clubName: string;
  competitionName: string;
  reputation: number;
}

export interface LoanOffer {
  seasonLabel: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  parentClubName: string;
  options: LoanOption[];
}

export interface ActiveLoan {
  parentClubId: string;
  parentClubName: string;
  loanClubId: string;
  loanClubName: string;
  seasonLabel: string;
}

export interface ScoutWatcher {
  clubName: string;
  interest: number;
  watchedThisWeek: boolean;
}

export type AttackStyle = 'SHOOT' | 'BALANCED' | 'CREATE';
export type Temperament = 'AGGRESSIVE' | 'COMPOSED' | 'DISCIPLINED';

export interface InstructionOption<K extends string> {
  key: K;
  label: string;
  description: string;
}

export interface DepthChartRow {
  name: string;
  rank: number;
  score: number;
  form: number;
  condition: number;
  available: boolean;
  isProtagonist: boolean;
  projectedStarter: boolean;
}

export interface DepthChartGroup {
  position: string;
  label: string;
  slots: number;
  rows: DepthChartRow[];
}

export interface TacticsView {
  clubName: string;
  formationLabel: string;
  depthChart: DepthChartGroup[];
  instructions: { style: AttackStyle; temperament: Temperament };
  styles: InstructionOption<AttackStyle>[];
  temperaments: InstructionOption<Temperament>[];
}

export type CalendarEntry =
  | {
      kind: 'MATCH';
      fixtureId: string;
      competitionName: string;
      opponentName: string;
      isHome: boolean;
      status: string;
      scoreLine: string | null;
      outcome: 'W' | 'D' | 'L' | null;
      rating: number | null;
      goals: number;
      assists: number;
    }
  | { kind: 'NEWS'; category: string; headline: string }
  | { kind: 'INJURY'; phase: 'START' | 'END'; label: string };

export interface CalendarDayView {
  date: string;
  isToday: boolean;
  injured: boolean;
  entries: CalendarEntry[];
}

export interface CalendarMonthView {
  month: string;
  clubName: string | null;
  currentDate: string;
  days: CalendarDayView[];
  nav: { prev: string | null; next: string | null };
}

export interface ScoutingWeek {
  watchers: ScoutWatcher[];
  offersFrom: string[];
  news: unknown[];
}

export interface PostMatchSession {
  opponent: string;
  resultLine: string;
  question: {
    key: string;
    prompt: string;
    answers: { key: string; label: string; tone: string }[];
  };
}

export interface SeasonStatsRow {
  seasonLabel: string;
  competitionName: string;
  clubName: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating: number;
}

export interface CareerLegacy {
  playerName: string;
  age: number;
  isRetired: boolean;
  totals: {
    appearances: number;
    goals: number;
    assists: number;
    averageRating: number;
    trophies: number;
    personalAwards: number;
  };
  bestSeason: SeasonStatsRow | null;
  grade: { key: string; label: string; description: string };
}

export interface NewsFeed {
  items: NewsItemRecord[];
  unread: number;
}

export interface CupWithHolder {
  competitionId: string;
  name: string;
  countryId: string | null;
  holderClubName: string | null;
  holderSeasonLabel: string | null;
}

export interface CupRunStep {
  roundLabel: string;
  opponentName: string;
  won: boolean;
  penalties: boolean;
}

export interface SimulateCupResult {
  competitionName: string;
  seasonLabel: string;
  championName: string;
  runnerUpName: string | null;
  roundsCount: number;
  protagonist: {
    participated: boolean;
    isChampion: boolean;
    exitRoundLabel: string | null;
    path: CupRunStep[];
  };
}

export interface ContinentalSummary {
  competitionId: string;
  name: string;
  holderClubName: string | null;
  holderSeasonLabel: string | null;
}

export interface SimulateContinentalResult {
  competitionName: string;
  seasonLabel: string;
  championName: string;
  runnerUpName: string | null;
  roundsCount: number;
  protagonist: {
    participated: boolean;
    isChampion: boolean;
    exitRoundLabel: string | null;
    path: CupRunStep[];
  };
}

export interface NationalTeamSummary {
  competitionId: string;
  name: string;
  holderCountryName: string | null;
  holderSeasonLabel: string | null;
}

export interface SimulateNationalTeamResult {
  competitionName: string;
  seasonLabel: string;
  championName: string;
  runnerUpName: string | null;
  roundsCount: number;
  protagonist: {
    participated: boolean;
    isChampion: boolean;
    exitRoundLabel: string | null;
    path: CupRunStep[];
  };
}

export interface SeasonAwardWinner {
  playerName: string;
  clubName: string;
  goals: number;
  assists: number;
  averageRating: number;
}

export interface SeasonAwardsResult {
  seasonLabel: string;
  competitionName: string;
  goldenBoot: SeasonAwardWinner | null;
  playerOfSeason: SeasonAwardWinner | null;
  alreadyAwarded: boolean;
  leagueStrength: number;
  leagueStrengthLabel: string;
  ballonDorEligible: boolean;
}

export type CareerTimelineEventType =
  | 'DEBUT'
  | 'FIRST_GOAL'
  | 'APPEARANCE_MILESTONE'
  | 'GOAL_MILESTONE'
  | 'TRANSFER'
  | 'TROPHY'
  | 'AWARD';

export interface CareerTimelineEvent {
  date: string;
  type: CareerTimelineEventType;
  title: string;
  description: string;
}

export interface StandingsTableRow {
  position: number;
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isProtagonistClub: boolean;
}

export interface LeagueTable {
  competitionId: string;
  competitionName: string;
  competitionLogo: string | null;
  countryId: string | null;
  seasonLabel: string;
  hasProtagonist: boolean;
  rows: StandingsTableRow[];
}

export interface HonourRecord {
  id: string;
  seasonLabel: string;
  type: string;
  competitionId: string | null;
  competitionName: string | null;
  clubId: string | null;
  clubName: string | null;
  playerId: string | null;
  playerName: string | null;
  createdAt: string;
}

export interface AdvanceWeekBody {
  weeks?: number;
  intensity?: TrainingIntensity;
}

export const api = {
  listSaves: () => http<SaveGameSummary[]>('/saves'),
  createSave: (input: NewGameInput) =>
    http<LoadedGame>('/saves', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getDashboard: (id: string) =>
    http<DashboardResponse>(`/saves/${id}/dashboard`),
  getNews: (id: string) => http<NewsFeed>(`/saves/${id}/news`),
  answerPostMatch: (id: string, answerKey: string) =>
    http<Record<string, number>>(`/saves/${id}/post-match`, {
      method: 'POST',
      body: JSON.stringify({ answerKey }),
    }),
  getSeasonStats: (id: string) =>
    http<SeasonStatsRow[]>(`/saves/${id}/season-stats`),
  getLegacy: (id: string) => http<CareerLegacy>(`/saves/${id}/legacy`),
  markNewsRead: (id: string) =>
    http<{ ok: boolean }>(`/saves/${id}/news/read`, { method: 'POST' }),
  decideCallup: (id: string, accept: boolean) =>
    http<NationalCallup>(`/saves/${id}/national-callup`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),
  decideNaturalization: (id: string, accept: boolean) =>
    http<NaturalizationOffer>(`/saves/${id}/naturalization`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),
  getCeremony: (id: string) =>
    http<{ ceremony: AwardCeremony | null }>(`/saves/${id}/ceremony`).then(
      (r) => r.ceremony,
    ),
  markCeremonySeen: (id: string, honourId: string) =>
    http<{ ok: true }>(`/saves/${id}/ceremony/seen`, {
      method: 'POST',
      body: JSON.stringify({ honourId }),
    }),
  getPresentation: (id: string) =>
    http<{ presentation: ClubPresentation | null }>(
      `/saves/${id}/presentation`,
    ).then((r) => r.presentation),
  markPresentationSeen: (id: string) =>
    http<{ ok: true }>(`/saves/${id}/presentation/seen`, { method: 'POST' }),
  listQuickStarts: () => http<QuickStartDefinition[]>(`/quick-starts`),
  getCalendar: (id: string, month?: string) =>
    http<CalendarMonthView>(
      `/saves/${id}/calendar${month ? `?month=${month}` : ''}`,
    ),
  getTactics: (id: string) => http<TacticsView | null>(`/saves/${id}/tactics`),
  setInstructions: (id: string, style: AttackStyle, temperament: Temperament) =>
    http<{ ok: boolean }>(`/saves/${id}/tactics`, {
      method: 'POST',
      body: JSON.stringify({ style, temperament }),
    }),
  getNextFixture: (id: string) =>
    http<NextFixtureView | null>(`/saves/${id}/next-fixture`),
  saveMatchPlan: (
    id: string,
    approach: MatchApproach,
    choices: Record<string, string>,
  ) =>
    http<{ ok: boolean }>(`/saves/${id}/match-plan`, {
      method: 'POST',
      body: JSON.stringify({ approach, choices }),
    }),
  chooseInjuryTreatment: (id: string, choice: 'REST' | 'RUSH') =>
    http<InjuryTreatmentResult>(`/saves/${id}/injury/treatment`, {
      method: 'POST',
      body: JSON.stringify({ choice }),
    }),
  advanceWeek: (id: string, body: AdvanceWeekBody) =>
    http<AdvanceResponse>(`/saves/${id}/advance-week`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  chooseEvent: (id: string, eventId: string, choiceKey: string) =>
    http<EventOutcome>(`/saves/${id}/events/${eventId}/choose`, {
      method: 'POST',
      body: JSON.stringify({ choiceKey }),
    }),
  getEditablePlayer: (id: string) =>
    http<EditablePlayer>(`/saves/${id}/editable-player`),
  editPlayer: (id: string, edits: PlayerEditInput) =>
    http<EditablePlayer>(`/saves/${id}/player`, {
      method: 'PATCH',
      body: JSON.stringify(edits),
    }),
  deleteSave: (id: string) =>
    http<{ deleted: boolean }>(`/saves/${id}`, { method: 'DELETE' }),
  getBalance: (id: string) =>
    http<{ balance: number; movements: LedgerEntry[] }>(
      `/saves/${id}/finance`,
    ),
  listClubs: (id: string) => http<ClubDirectoryEntry[]>(`/saves/${id}/clubs`),
  listOffers: (id: string) =>
    http<ProtagonistOfferView[]>(`/saves/${id}/offers`),
  respondOffer: (id: string, offerId: string, accept: boolean) =>
    http<{ accepted: boolean }>(`/saves/${id}/offers/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),
  signWithClub: (id: string, clubId: string) =>
    http<SignResult>(`/saves/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ clubId }),
    }),
  listShop: (id: string) => http<ShopItem[]>(`/saves/${id}/shop`),
  buyItem: (id: string, itemKey: string) =>
    http<{ balance: number; item: ShopItem }>(`/saves/${id}/shop/buy`, {
      method: 'POST',
      body: JSON.stringify({ itemKey }),
    }),
  listAgents: (id: string) =>
    http<{ agents: Agent[]; currentAgentKey: string | null }>(
      `/saves/${id}/agents`,
    ),
  chooseAgent: (id: string, agentKey: string) =>
    http<{ agentKey: string }>(`/saves/${id}/agent`, {
      method: 'POST',
      body: JSON.stringify({ agentKey }),
    }),
  negotiateWage: (id: string) =>
    http<AgentActionResult>(`/saves/${id}/agent/negotiate-wage`, {
      method: 'POST',
    }),
  agentRequest: (id: string, type: AgentRequestType) =>
    http<AgentActionResult>(`/saves/${id}/agent/request`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  listLifestyles: (id: string) =>
    http<{ lifestyles: Lifestyle[]; current: string | null }>(
      `/saves/${id}/lifestyles`,
    ),
  chooseLifestyle: (id: string, lifestyle: string) =>
    http<{ lifestyle: string }>(`/saves/${id}/lifestyle`, {
      method: 'POST',
      body: JSON.stringify({ lifestyle }),
    }),
  getAvatar: (id: string) =>
    http<{ avatarDataUrl: string | null }>(`/saves/${id}/avatar`),
  uploadAvatar: (id: string, dataUrl: string | null) =>
    http<{ avatarDataUrl: string | null }>(`/saves/${id}/avatar`, {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    }),
  getInterview: (id: string) =>
    http<InterviewSession>(`/saves/${id}/interview`),
  submitInterview: (
    id: string,
    answers: { questionKey: string; answerKey: string }[],
  ) =>
    http<InterviewResult>(`/saves/${id}/interview`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  listCups: (id: string) => http<CupWithHolder[]>(`/saves/${id}/cups`),
  simulateCup: (id: string, competitionId: string) =>
    http<SimulateCupResult>(`/saves/${id}/cups/${competitionId}/simulate`, {
      method: 'POST',
    }),
  listHonours: (id: string) => http<HonourRecord[]>(`/saves/${id}/honours`),
  getContinental: (id: string) =>
    http<ContinentalSummary | null>(`/saves/${id}/continental`),
  simulateContinental: (id: string) =>
    http<SimulateContinentalResult>(`/saves/${id}/continental/simulate`, {
      method: 'POST',
    }),
  getNationalTeam: (id: string) =>
    http<NationalTeamSummary | null>(`/saves/${id}/national-team`),
  simulateNationalTeam: (id: string) =>
    http<SimulateNationalTeamResult>(`/saves/${id}/national-team/simulate`, {
      method: 'POST',
    }),
  assignSeasonAwards: (id: string) =>
    http<SeasonAwardsResult>(`/saves/${id}/awards/assign`, {
      method: 'POST',
    }),
  getCareerTimeline: (id: string) =>
    http<CareerTimelineEvent[]>(`/saves/${id}/career-timeline`),
  getStandings: (id: string) => http<LeagueTable[]>(`/saves/${id}/standings`),
  decideLoan: (id: string, accept: boolean, clubId?: string) =>
    http<{ status: string; accepted: boolean; clubName: string | null }>(
      `/saves/${id}/loan`,
      {
        method: 'POST',
        body: JSON.stringify(clubId ? { accept, clubId } : { accept }),
      },
    ),
  simulateSeason: (id: string, body: AdvanceWeekBody) =>
    http<SeasonSkipSummary>(`/saves/${id}/simulate-season`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getSettings: () =>
    http<{ settings: ServerSettings; intervals: AutoSaveInterval[] }>(
      '/settings',
    ),
  saveSettings: (settings: ServerSettings) =>
    http<{ settings: ServerSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  listSnapshots: () => http<{ snapshots: SnapshotView[] }>('/snapshots'),
  takeSnapshot: () =>
    http<{ snapshot: SnapshotView }>('/snapshots', { method: 'POST' }),
  deleteSnapshot: (name: string) =>
    http<{ deleted: boolean }>(`/snapshots/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  restoreSnapshot: (name: string) =>
    http<{ restored: boolean }>(
      `/snapshots/${encodeURIComponent(name)}/restore`,
      { method: 'POST' },
    ),
  getMarket: (id: string) => http<MarketView>(`/saves/${id}/market`),
  getTalks: (id: string) =>
    http<{ talks: TalksView | null }>(`/saves/${id}/talks`),
  openTalks: (id: string, subject: string) =>
    http<{ talks: TalksView | null; refusal: TalksRefusal | null }>(
      `/saves/${id}/talks/open`,
      { method: 'POST', body: JSON.stringify({ subject }) },
    ),
  proposeTerms: (id: string, proposal: ContractPackage) =>
    http<ProposalResult>(`/saves/${id}/talks/propose`, {
      method: 'POST',
      body: JSON.stringify(proposal),
    }),
  signTalks: (id: string) =>
    http<{
      signed: boolean;
      terms: ContractPackage;
      clubName: string;
      signingBonusPaid: number;
    }>(
      `/saves/${id}/talks/sign`,
      { method: 'POST' },
    ),
  cancelTalks: (id: string) =>
    http<{ ok: boolean }>(`/saves/${id}/talks/cancel`, { method: 'POST' }),
  previewNegotiation: (id: string, offerId: string, ask: NegotiationAsk) =>
    http<NegotiationPreview>(
      `/saves/${id}/market/offers/${offerId}/negotiation?ask=${ask}`,
    ),
  negotiate: (id: string, offerId: string, ask: NegotiationAsk) =>
    http<NegotiationOutcome>(
      `/saves/${id}/market/offers/${offerId}/negotiate`,
      {
        method: 'POST',
        body: JSON.stringify({ ask }),
      },
    ),
  getPlayerProfile: (id: string) =>
    http<PlayerProfileView>(`/saves/${id}/player-profile`),
  getWorld: (id: string) => http<EditableWorldView>(`/saves/${id}/world`),
  editWorldClub: (
    id: string,
    clubId: string,
    edit: { name?: string; shortName?: string; logo?: string | null },
  ) =>
    http<{ ok: boolean }>(`/saves/${id}/world/club/${clubId}`, {
      method: 'POST',
      body: JSON.stringify(edit),
    }),
  editWorldCompetition: (
    id: string,
    competitionId: string,
    edit: { name?: string; logo?: string | null },
  ) =>
    http<{ ok: boolean }>(`/saves/${id}/world/competition/${competitionId}`, {
      method: 'POST',
      body: JSON.stringify(edit),
    }),
};

export interface SeasonSkipSummary {
  seasonLabel: string | null;
  clubName: string | null;
  weeksSimulated: number;
  seasonCompleted: boolean;
  retired: boolean;
  matchesPlayedByClub: number;
  appearances: number;
  goals: number;
  assists: number;
  averageRating: number | null;
  yellowCards: number;
  redCards: number;
  won: number;
  drawn: number;
  lost: number;
  titles: { type: string; competitionName: string }[];
  awards: { type: string; label: string; competitionName: string | null }[];
  abilityBefore: number;
  abilityAfter: number;
  injuriesSustained: number;
  newSeasonLabel: string | null;
  unreadNews: number;
}

export interface EditableWorldClub {
  clubId: string;
  name: string;
  shortName: string;
  logo: string | null;
  countryId: string;
  competitionName: string | null;
}

export interface EditableWorldCompetition {
  competitionId: string;
  name: string;
  logo: string | null;
  type: string;
  countryId: string | null;
}

export interface EditableWorldView {
  clubs: EditableWorldClub[];
  competitions: EditableWorldCompetition[];
}

export interface InterviewSession {
  available: boolean;
  weekIndex: number;
  questions: InterviewSessionQuestion[];
}

export interface InterviewResult {
  deltas: Record<string, number>;
  stats: Record<string, number>;
}

export interface AgentActionResult {
  status: 'ok';
  message: string;
  balance?: number;
}
