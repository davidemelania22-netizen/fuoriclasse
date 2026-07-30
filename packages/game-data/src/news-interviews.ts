import type { InterviewQuestion } from '@football-life/shared';

/**
 * Press-conference questions triggered by what is actually in the news: the
 * journalists have read the same inbox you have. One template per news
 * category; the prompt interpolates {newsHeadline} (and the usual
 * {firstName}/{clubName}). Same trade-off philosophy as the generic catalog:
 * no pure-positive answer.
 */
export const NEWS_INTERVIEW_TEMPLATES: Record<string, InterviewQuestion> = {
  SCOUT: {
    key: 'news-scout',
    prompt:
      'I giornali titolano: «{newsHeadline}». Il mercato ti distrae, {firstName}?',
    answers: [
      {
        key: 'humble',
        label: 'Penso solo ad allenarmi, il resto non mi riguarda',
        tone: 'HUMBLE',
        consequences: { reputation: 5, morale: 3, popularity: -3 },
      },
      {
        key: 'bold',
        label: 'È normale che i grandi club mi seguano: sono pronto',
        tone: 'BOLD',
        consequences: { popularity: 8, reputation: 3, stress: 5, morale: -2 },
      },
      {
        key: 'diplomatic',
        label: 'Fa piacere, ma il mio presente è il {clubName}',
        tone: 'DIPLOMATIC',
        consequences: { morale: 4, reputation: 2, popularity: 1 },
      },
    ],
  },
  SACKING: {
    key: 'news-sacking',
    prompt:
      '«{newsHeadline}»: le panchine saltano. Che clima si respira nello spogliatoio?',
    answers: [
      {
        key: 'humble',
        label: 'Dispiace sempre, noi giocatori abbiamo le nostre colpe',
        tone: 'HUMBLE',
        consequences: { reputation: 6, stress: 3, popularity: -1 },
      },
      {
        key: 'bold',
        label: 'Il calcio è così: chi non fa risultati va a casa',
        tone: 'BOLD',
        consequences: { popularity: 5, reputation: -3, stress: 2 },
      },
      {
        key: 'diplomatic',
        label: 'Sono scelte delle società, noi pensiamo al campo',
        tone: 'DIPLOMATIC',
        consequences: { morale: 3, reputation: 2 },
      },
    ],
  },
  TRANSFER: {
    key: 'news-transfer',
    prompt:
      'Il mercato è caldo — «{newsHeadline}». Come cambia la concorrenza, {firstName}?',
    answers: [
      {
        key: 'humble',
        label: 'Ogni acquisto alza il livello: mi farà migliorare',
        tone: 'HUMBLE',
        consequences: { morale: 4, reputation: 4, popularity: -2 },
      },
      {
        key: 'bold',
        label: 'Non temo nessuno: il posto è mio',
        tone: 'BOLD',
        consequences: { popularity: 7, stress: 5, mentalHealth: -2 },
      },
      {
        key: 'diplomatic',
        label: 'La rosa si valuta a giugno, non sul mercato',
        tone: 'DIPLOMATIC',
        consequences: { reputation: 3, morale: 2 },
      },
    ],
  },
  YOUTH: {
    key: 'news-youth',
    prompt:
      '«{newsHeadline}». I giovani spingono: ti senti minacciato, {firstName}?',
    answers: [
      {
        key: 'humble',
        label: 'Ben vengano: li aiuterò come i veterani fecero con me',
        tone: 'HUMBLE',
        consequences: { reputation: 6, morale: 3, popularity: -2 },
      },
      {
        key: 'bold',
        label: 'Prima devono togliermi la maglia, e non ci riusciranno',
        tone: 'BOLD',
        consequences: { popularity: 6, stress: 4, morale: -1 },
      },
      {
        key: 'diplomatic',
        label: 'La concorrenza interna fa bene a tutta la squadra',
        tone: 'DIPLOMATIC',
        consequences: { reputation: 3, morale: 2 },
      },
    ],
  },
  NATIONAL: {
    key: 'news-national',
    prompt:
      '«{newsHeadline}»: la Nazionale bussa. Cosa significa per te, {firstName}?',
    answers: [
      {
        key: 'humble',
        label: 'Un onore immenso, lo devo a chi mi allena ogni giorno',
        tone: 'HUMBLE',
        consequences: { reputation: 6, morale: 4, popularity: -1 },
      },
      {
        key: 'bold',
        label: 'Era ora: il mio posto è tra i migliori',
        tone: 'BOLD',
        consequences: { popularity: 8, stress: 5, mentalHealth: -2 },
      },
      {
        key: 'diplomatic',
        label: 'Ci penserò dopo la prossima partita di campionato',
        tone: 'DIPLOMATIC',
        consequences: { reputation: 3, morale: 2 },
      },
    ],
  },
  PROTAGONIST: {
    key: 'news-protagonist',
    prompt:
      'Tutti parlano di te: «{newsHeadline}». Come gestisci le attenzioni?',
    answers: [
      {
        key: 'humble',
        label: 'Una bella pagina, ma domani si riparte da zero',
        tone: 'HUMBLE',
        consequences: { reputation: 6, mentalHealth: 3, popularity: -2 },
      },
      {
        key: 'bold',
        label: 'È solo l’inizio: farò parlare ancora di me',
        tone: 'BOLD',
        consequences: { popularity: 9, stress: 5, mentalHealth: -3 },
      },
      {
        key: 'diplomatic',
        label: 'Le copertine passano, i trofei restano',
        tone: 'DIPLOMATIC',
        consequences: { reputation: 4, morale: 2 },
      },
    ],
  },
};
