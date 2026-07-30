import type { InterviewQuestion } from '@football-life/shared';

/**
 * Press-conference questions, license-free. Each answer carries a tone with a
 * trade-off (no pure-positive option), so the choice expresses who you are
 * rather than being a free stat pump. Prompts interpolate {firstName}/{clubName}.
 */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    key: 'q-form',
    prompt: 'Come giudichi il tuo momento di forma, {firstName}?',
    answers: [
      {
        key: 'humble',
        label: 'Posso fare molto di più, testa bassa e lavoro',
        tone: 'HUMBLE',
        consequences: { reputation: 6, morale: 3, popularity: -2 },
      },
      {
        key: 'bold',
        label: 'Sono il migliore in campo, senza dubbi',
        tone: 'BOLD',
        consequences: { popularity: 8, stress: 4, mentalHealth: -3 },
      },
      {
        key: 'diplomatic',
        label: 'Conta solo la squadra, io faccio la mia parte',
        tone: 'DIPLOMATIC',
        consequences: { reputation: 3, morale: 2 },
      },
    ],
  },
  {
    key: 'q-club',
    prompt: 'Un commento sul tuo rapporto con il {clubName}?',
    answers: [
      {
        key: 'humble',
        label: 'Sono grato, qui mi sento a casa',
        tone: 'HUMBLE',
        consequences: { morale: 5, reputation: 4 },
      },
      {
        key: 'bold',
        label: 'Merito un palcoscenico più grande',
        tone: 'BOLD',
        consequences: { popularity: 7, morale: -4, stress: 4 },
      },
      {
        key: 'diplomatic',
        label: 'Penso partita dopo partita',
        tone: 'DIPLOMATIC',
        consequences: { reputation: 2, mentalHealth: 2 },
      },
    ],
  },
  {
    key: 'q-critics',
    prompt: 'Come rispondi a chi ti critica?',
    answers: [
      {
        key: 'humble',
        label: 'Le critiche mi fanno crescere',
        tone: 'HUMBLE',
        consequences: { mentalHealth: 5, reputation: 3 },
      },
      {
        key: 'bold',
        label: 'I critici parlano, io gioco',
        tone: 'BOLD',
        consequences: { popularity: 6, motivation: 3, mentalHealth: -2 },
      },
      {
        key: 'diplomatic',
        label: 'Ognuno ha la sua opinione, la rispetto',
        tone: 'DIPLOMATIC',
        consequences: { morale: 2, mentalHealth: 2 },
      },
    ],
  },
  {
    key: 'q-future',
    prompt: 'Dove ti vedi tra qualche anno?',
    answers: [
      {
        key: 'humble',
        label: 'Un passo alla volta, senza fretta',
        tone: 'HUMBLE',
        consequences: { reputation: 4, morale: 2 },
      },
      {
        key: 'bold',
        label: 'Ai vertici del calcio mondiale',
        tone: 'BOLD',
        consequences: { popularity: 8, motivation: 4, stress: 3 },
      },
      {
        key: 'diplomatic',
        label: 'Dove il calcio mi porterà',
        tone: 'DIPLOMATIC',
        consequences: { popularity: 2, mentalHealth: 2 },
      },
    ],
  },
  {
    key: 'q-private',
    prompt: 'I tifosi sono curiosi della tua vita privata. Cosa dici?',
    answers: [
      {
        key: 'humble',
        label: 'Resto una persona normale',
        tone: 'HUMBLE',
        consequences: { reputation: 5, mentalHealth: 3, popularity: -2 },
      },
      {
        key: 'bold',
        label: 'Mi piace la bella vita, perché no',
        tone: 'BOLD',
        consequences: { popularity: 9, happiness: 4, reputation: -3 },
      },
      {
        key: 'diplomatic',
        label: 'Preferisco parlare solo di calcio',
        tone: 'DIPLOMATIC',
        consequences: { mentalHealth: 4 },
      },
    ],
  },
  {
    key: 'q-pressure',
    prompt: 'Come gestisci la pressione, {firstName}?',
    answers: [
      {
        key: 'humble',
        label: 'Mi affido al lavoro e ai compagni',
        tone: 'HUMBLE',
        consequences: { morale: 4, mentalHealth: 3 },
      },
      {
        key: 'bold',
        label: 'La pressione è un privilegio dei grandi',
        tone: 'BOLD',
        consequences: { popularity: 6, motivation: 4, stress: 3 },
      },
      {
        key: 'diplomatic',
        label: 'Cerco solo di restare equilibrato',
        tone: 'DIPLOMATIC',
        consequences: { mentalHealth: 4, morale: 2 },
      },
    ],
  },
];

/**
 * Flash post-match questions, picked by how the protagonist's game went.
 * Prompts interpolate {opponent}. Same trade-off philosophy as above.
 */
export const POST_MATCH_QUESTIONS: InterviewQuestion[] = [
  {
    key: 'pm-star',
    prompt: 'Prestazione da copertina contro il {opponent}: come la racconti?',
    answers: [
      {
        key: 'humble',
        label: 'Il merito è dei compagni, io ho solo concluso il lavoro',
        tone: 'HUMBLE',
        consequences: { reputation: 7, morale: 4, popularity: -1 },
      },
      {
        key: 'bold',
        label: 'Serate così sono il mio standard, abituatevi',
        tone: 'BOLD',
        consequences: { popularity: 10, stress: 5, mentalHealth: -3 },
      },
      {
        key: 'diplomatic',
        label: 'Conta il risultato, la prestazione passa',
        tone: 'DIPLOMATIC',
        consequences: { reputation: 4, mentalHealth: 2 },
      },
    ],
  },
  {
    key: 'pm-win',
    prompt: 'Vittoria contro il {opponent}: la tua lettura a caldo?',
    answers: [
      {
        key: 'humble',
        label: 'Abbiamo sofferto insieme, vinto insieme',
        tone: 'HUMBLE',
        consequences: { morale: 5, reputation: 3 },
      },
      {
        key: 'bold',
        label: 'Con me in campo queste partite si vincono',
        tone: 'BOLD',
        consequences: { popularity: 7, morale: 2, stress: 4 },
      },
      {
        key: 'diplomatic',
        label: 'Tre punti, testa alla prossima',
        tone: 'DIPLOMATIC',
        consequences: { mentalHealth: 3, reputation: 2 },
      },
    ],
  },
  {
    key: 'pm-loss',
    prompt: 'Sconfitta contro il {opponent}: cosa non ha funzionato?',
    answers: [
      {
        key: 'humble',
        label: 'Mi prendo le mie responsabilità, dovevo dare di più',
        tone: 'HUMBLE',
        consequences: { reputation: 5, stress: 3, morale: -2 },
      },
      {
        key: 'bold',
        label: 'Io ho fatto la mia parte, altri no',
        tone: 'BOLD',
        consequences: { popularity: 4, morale: -5, stress: 5 },
      },
      {
        key: 'diplomatic',
        label: 'Analizzeremo gli errori con calma, si riparte',
        tone: 'DIPLOMATIC',
        consequences: { mentalHealth: 3, morale: 1 },
      },
    ],
  },
  {
    key: 'pm-draw',
    prompt: 'Pareggio con il {opponent}: punto guadagnato o due persi?',
    answers: [
      {
        key: 'humble',
        label: 'Due persi: dovevamo chiuderla, io per primo',
        tone: 'HUMBLE',
        consequences: { reputation: 4, stress: 2 },
      },
      {
        key: 'bold',
        label: 'Se i miei cross venissero sfruttati, avremmo vinto',
        tone: 'BOLD',
        consequences: { popularity: 5, morale: -3, stress: 3 },
      },
      {
        key: 'diplomatic',
        label: 'Un punto che farà classifica a fine anno',
        tone: 'DIPLOMATIC',
        consequences: { mentalHealth: 2, morale: 2 },
      },
    ],
  },
];
