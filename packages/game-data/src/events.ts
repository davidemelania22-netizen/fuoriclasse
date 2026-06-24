import { EventCategory, type GameEventDefinition } from '@football-life/shared';

const C = EventCategory;

/**
 * Catalogo eventi (MVP), license-free. I trigger leggono i campi di
 * EventContext; le conseguenze sono delta applicati dal resolver. File di soli
 * dati, così il set può crescere senza toccare il motore.
 */
export const EVENT_DEFINITIONS: GameEventDefinition[] = [
  // ---------------------------------------------------------------- CALCIO
  {
    id: 'fb-training-breakthrough',
    category: C.Football,
    title: 'Svolta in allenamento',
    descriptionTemplate:
      'Una grande settimana sul campo di allenamento attira l’attenzione.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 8,
    cooldownWeeks: 8,
    choices: [
      {
        key: 'push',
        label: 'Spingi ancora di più',
        consequences: { motivation: 6, stress: 4 },
      },
      {
        key: 'steady',
        label: 'Mantieni la misura',
        consequences: { morale: 3 },
      },
    ],
  },
  {
    id: 'fb-bad-week',
    category: C.Football,
    title: 'Periodo difficile',
    descriptionTemplate: 'Niente gira in allenamento questa settimana.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 6,
    cooldownWeeks: 6,
    choices: [
      {
        key: 'work',
        label: 'Fai ore extra',
        consequences: { motivation: 4, stress: 5 },
      },
      {
        key: 'rest',
        label: 'Prenditi una pausa',
        consequences: { morale: 2, stress: -4 },
      },
    ],
  },
  {
    id: 'fb-youth-tournament',
    category: C.Football,
    title: 'Torneo giovanile',
    descriptionTemplate:
      'Gli osservatori si radunano per una vetrina giovanile.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: false }] },
    weight: 5,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'shine',
        label: 'Gioca per te stesso',
        consequences: { reputation: 30, morale: 4 },
      },
      {
        key: 'team',
        label: 'Gioca per la squadra',
        consequences: { reputation: 15, morale: 6 },
      },
    ],
  },
  {
    id: 'fb-penalty-duty',
    category: C.Football,
    title: 'Incaricato dei rigori',
    descriptionTemplate: 'L’allenatore ti propone di tirare i rigori.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 4,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'accept',
        label: 'Prendi la responsabilità',
        consequences: { reputation: 20, stress: 4 },
      },
      {
        key: 'decline',
        label: 'Lascia ad altri',
        consequences: { stress: -2 },
      },
    ],
  },
  {
    id: 'fb-captain-talk',
    category: C.Football,
    title: 'Ruolo da leader',
    descriptionTemplate: 'I senatori vogliono che tu dia l’esempio.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 55 }] },
    weight: 3,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'embrace',
        label: 'Accetta il ruolo',
        consequences: { reputation: 25, motivation: 5 },
      },
      { key: 'modest', label: 'Resta umile', consequences: { morale: 3 } },
    ],
  },
  {
    id: 'fb-derby-week',
    category: C.Football,
    title: 'Settimana del derby',
    descriptionTemplate: 'Incombe la partita più importante della stagione.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 5,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'focus',
        label: 'Massima concentrazione',
        consequences: { motivation: 6, stress: 6 },
      },
      {
        key: 'relax',
        label: 'Trattala come una gara qualsiasi',
        consequences: { stress: -3 },
      },
    ],
  },

  // ------------------------------------------------------------------- ALLENATORE
  {
    id: 'coach-praise',
    category: C.Coach,
    title: 'Elogio dell’allenatore',
    descriptionTemplate: 'L’allenatore ti elogia pubblicamente.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 6,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'grateful',
        label: 'Ringrazialo',
        consequences: { morale: 6, motivation: 3 },
      },
      {
        key: 'humble',
        label: 'Resta coi piedi per terra',
        consequences: { morale: 3 },
      },
    ],
  },
  {
    id: 'coach-criticism',
    category: C.Coach,
    title: 'Parole dure',
    descriptionTemplate:
      'L’allenatore critica il tuo atteggiamento davanti alla squadra.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 8,
    choices: [
      {
        key: 'accept',
        label: 'Incassa il colpo',
        consequences: { motivation: 4, morale: -2 },
      },
      {
        key: 'argue',
        label: 'Rispondi a tono',
        consequences: { morale: -4, reputation: -10, stress: 5 },
      },
    ],
  },
  {
    id: 'coach-position-change',
    category: C.Coach,
    title: 'Nuovo ruolo',
    descriptionTemplate: 'L’allenatore vuole provarti in un ruolo diverso.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 4,
    cooldownWeeks: 24,
    choices: [
      {
        key: 'adapt',
        label: 'Provaci',
        consequences: { motivation: 4, stress: 3 },
      },
      {
        key: 'resist',
        label: 'Preferisci il tuo ruolo',
        consequences: { morale: -3 },
      },
    ],
  },
  {
    id: 'coach-extra-sessions',
    category: C.Coach,
    title: 'Sessioni extra',
    descriptionTemplate: 'L’allenatore offre sedute individuali.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 23 }] },
    weight: 4,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'in',
        label: 'Arriva in anticipo',
        consequences: { motivation: 5, stress: 3 },
      },
      {
        key: 'out',
        label: 'Saltale',
        consequences: { morale: 2, motivation: -3 },
      },
    ],
  },
  {
    id: 'coach-trust',
    category: C.Coach,
    title: 'Voto di fiducia',
    descriptionTemplate: 'L’allenatore ti difende pubblicamente.',
    trigger: { all: [{ field: 'morale', op: 'lt', value: 45 }] },
    weight: 5,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'lift',
        label: 'Senti il sostegno',
        consequences: { morale: 10, stress: -3 },
      },
    ],
  },

  // --------------------------------------------------------------- COMPAGNI
  {
    id: 'team-welcome',
    category: C.Teammates,
    title: 'Accoglienza nello spogliatoio',
    descriptionTemplate: 'I compagni si impegnano per accoglierti.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 6,
    cooldownWeeks: 30,
    maxOccurrencesPerCareer: 3,
    choices: [
      {
        key: 'join',
        label: 'Unisciti a loro',
        consequences: { morale: 6, happiness: 5 },
      },
      {
        key: 'reserved',
        label: 'Resta riservato',
        consequences: { morale: 1 },
      },
    ],
  },
  {
    id: 'team-night-out',
    category: C.Teammates,
    title: 'Serata fuori',
    descriptionTemplate: 'La squadra organizza una serata.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'go',
        label: 'Esci',
        consequences: { happiness: 6, stress: -4, money: -300 },
      },
      {
        key: 'stay',
        label: 'Resta a casa',
        consequences: { stress: -1, motivation: 2 },
      },
    ],
  },
  {
    id: 'team-rivalry',
    category: C.Teammates,
    title: 'Rivalità interna',
    descriptionTemplate: 'Un compagno ti vede come una minaccia.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 50 }] },
    weight: 4,
    cooldownWeeks: 18,
    choices: [
      {
        key: 'defuse',
        label: 'Stempera la tensione',
        consequences: { morale: 3 },
      },
      {
        key: 'compete',
        label: 'Surclassalo',
        consequences: { motivation: 5, stress: 4 },
      },
    ],
  },
  {
    id: 'team-support',
    category: C.Teammates,
    title: 'Una spalla su cui contare',
    descriptionTemplate: 'Un compagno esperto si interessa a te.',
    trigger: { all: [{ field: 'stress', op: 'gte', value: 60 }] },
    weight: 5,
    cooldownWeeks: 8,
    choices: [
      {
        key: 'open',
        label: 'Apriti',
        consequences: { stress: -8, mentalHealth: 6, morale: 4 },
      },
      { key: 'brush', label: 'Minimizza', consequences: { stress: -2 } },
    ],
  },

  // ------------------------------------------------------------------ FAMIGLIA
  {
    id: 'fam-support',
    category: C.Family,
    title: 'Sostegno della famiglia',
    descriptionTemplate: 'La tua famiglia viaggia per vederti giocare.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 6,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'cherish',
        label: 'Goditi il momento',
        consequences: { happiness: 8, morale: 5 },
      },
    ],
  },
  {
    id: 'fam-pressure',
    category: C.Family,
    title: 'Aspettative della famiglia',
    descriptionTemplate: 'I parenti caricano di pressione per il successo.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 20 }] },
    weight: 5,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'embrace',
        label: 'Usala come carburante',
        consequences: { motivation: 5, stress: 5 },
      },
      {
        key: 'distance',
        label: 'Metti dei limiti',
        consequences: { stress: -4, happiness: -2 },
      },
    ],
  },
  {
    id: 'fam-illness',
    category: C.Family,
    title: 'Malattia in famiglia',
    descriptionTemplate: 'Un parente stretto si ammala.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 3,
    cooldownWeeks: 40,
    maxOccurrencesPerCareer: 2,
    choices: [
      {
        key: 'home',
        label: 'Torna a casa per un po’',
        consequences: { happiness: -4, stress: 6, morale: -3 },
      },
      {
        key: 'focus',
        label: 'Incanala tutto nel calcio',
        consequences: { motivation: 4, mentalHealth: -4 },
      },
    ],
  },
  {
    id: 'fam-celebration',
    category: C.Family,
    title: 'Festa di famiglia',
    descriptionTemplate: 'Una grande festa di famiglia ti tira su il morale.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'enjoy',
        label: 'Goditela appieno',
        consequences: { happiness: 7, stress: -3 },
      },
    ],
  },

  // ------------------------------------------------------------------ SCUOLA
  {
    id: 'school-exams',
    category: C.School,
    title: 'Periodo di esami',
    descriptionTemplate:
      'Gli esami scolastici si scontrano con gli allenamenti.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 18 }] },
    weight: 6,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'study',
        label: 'Dai priorità allo studio',
        consequences: { stress: 4, happiness: 2, motivation: -2 },
      },
      {
        key: 'football',
        label: 'Dai priorità al calcio',
        consequences: { motivation: 4, stress: 3 },
      },
    ],
  },
  {
    id: 'school-mentor',
    category: C.School,
    title: 'Un insegnante d’aiuto',
    descriptionTemplate: 'Un insegnante ti guida in un trimestre difficile.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 18 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'accept',
        label: 'Accetta l’aiuto',
        consequences: { mentalHealth: 5, stress: -3 },
      },
    ],
  },
  {
    id: 'school-dropout-pressure',
    category: C.School,
    title: 'Lasciare la scuola?',
    descriptionTemplate:
      'Qualcuno suggerisce di lasciare la scuola per dedicarti al calcio.',
    trigger: {
      all: [
        { field: 'age', op: 'gte', value: 16 },
        { field: 'age', op: 'lte', value: 18 },
      ],
    },
    weight: 3,
    cooldownWeeks: 52,
    maxOccurrencesPerCareer: 1,
    choices: [
      {
        key: 'leave',
        label: 'Lascia la scuola',
        consequences: { motivation: 5, happiness: -3 },
      },
      {
        key: 'stay',
        label: 'Finisci gli studi',
        consequences: { mentalHealth: 4, motivation: -2 },
      },
    ],
  },
  {
    id: 'school-balance',
    category: C.School,
    title: 'Equilibrismo',
    descriptionTemplate: 'Conciliare scuola e calcio ti logora.',
    trigger: {
      all: [
        { field: 'age', op: 'lte', value: 18 },
        { field: 'stress', op: 'gte', value: 50 },
      ],
    },
    weight: 4,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'plan',
        label: 'Fatti un programma',
        consequences: { stress: -6, motivation: 3 },
      },
    ],
  },

  // -------------------------------------------------------------------- AMORE
  {
    id: 'love-new',
    category: C.Love,
    title: 'Una nuova relazione',
    descriptionTemplate: 'Conosci una persona speciale.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 30,
    maxOccurrencesPerCareer: 3,
    choices: [
      {
        key: 'commit',
        label: 'Impegnati',
        consequences: { happiness: 10, stress: -2 },
      },
      {
        key: 'casual',
        label: 'Tienila leggera',
        consequences: { happiness: 4 },
      },
    ],
  },
  {
    id: 'love-distance',
    category: C.Love,
    title: 'A distanza',
    descriptionTemplate: 'Un trasferimento mette alla prova la relazione.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 18 }] },
    weight: 3,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'work',
        label: 'Falla funzionare',
        consequences: { happiness: 3, stress: 3 },
      },
      {
        key: 'end',
        label: 'Chiudila',
        consequences: { happiness: -6, motivation: 3 },
      },
    ],
  },
  {
    id: 'love-support',
    category: C.Love,
    title: 'Una presenza stabile',
    descriptionTemplate: 'Il tuo partner ti aiuta in un momento no.',
    trigger: {
      all: [
        { field: 'morale', op: 'lt', value: 50 },
        { field: 'age', op: 'gte', value: 18 },
      ],
    },
    weight: 4,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'lean',
        label: 'Appoggiati a lei/lui',
        consequences: { morale: 8, mentalHealth: 5 },
      },
    ],
  },
  {
    id: 'love-proposal',
    category: C.Love,
    title: 'Un grande passo',
    descriptionTemplate: 'Pensi di fare la proposta.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 23 }] },
    weight: 2,
    cooldownWeeks: 52,
    maxOccurrencesPerCareer: 1,
    choices: [
      {
        key: 'propose',
        label: 'Fai la proposta',
        consequences: { happiness: 14, money: -8000 },
      },
      { key: 'wait', label: 'Aspetta ancora', consequences: { happiness: -1 } },
    ],
  },

  // ------------------------------------------------------------------- PROCURATORE
  {
    id: 'agent-offer',
    category: C.Agent,
    title: 'Chiama un nuovo procuratore',
    descriptionTemplate: 'Un noto procuratore vuole rappresentarti.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 45 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'sign',
        label: 'Firma con lui',
        consequences: { reputation: 25, money: -2000 },
      },
      {
        key: 'pass',
        label: 'Resta col tuo',
        consequences: { morale: 2 },
      },
    ],
  },
  {
    id: 'agent-advice',
    category: C.Agent,
    title: 'Consigli di carriera',
    descriptionTemplate: 'Il tuo procuratore traccia un piano di carriera.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 18,
    choices: [
      {
        key: 'follow',
        label: 'Segui il piano',
        consequences: { motivation: 4 },
      },
      {
        key: 'own',
        label: 'Vai per la tua strada',
        consequences: { morale: 2, motivation: 2 },
      },
    ],
  },
  {
    id: 'agent-greedy',
    category: C.Agent,
    title: 'Disputa sulla commissione',
    descriptionTemplate: 'Il tuo procuratore chiede una fetta più grande.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 500 }] },
    weight: 3,
    cooldownWeeks: 26,
    choices: [
      { key: 'pay', label: 'Paga', consequences: { money: -5000, stress: -2 } },
      {
        key: 'refuse',
        label: 'Rifiuta',
        consequences: { stress: 5, reputation: -5 },
      },
    ],
  },
  {
    id: 'agent-media-push',
    category: C.Agent,
    title: 'Spinta mediatica',
    descriptionTemplate: 'Il tuo procuratore organizza apparizioni mediatiche.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 300 }] },
    weight: 4,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'accept',
        label: 'Fai il giro',
        consequences: { popularity: 40, stress: 3 },
      },
      {
        key: 'decline',
        label: 'Resta defilato',
        consequences: { stress: -2 },
      },
    ],
  },

  // ------------------------------------------------------------------- MEDIA
  {
    id: 'media-interview',
    category: C.Media,
    title: 'Intervista locale',
    descriptionTemplate: 'Una testata locale chiede un’intervista.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 15 }] },
    weight: 5,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'charm',
        label: 'Conquistali',
        consequences: { popularity: 25, reputation: 10 },
      },
      {
        key: 'guarded',
        label: 'Resta sulle tue',
        consequences: { popularity: 5 },
      },
    ],
  },
  {
    id: 'media-rumour',
    category: C.Media,
    title: 'Voci di mercato',
    descriptionTemplate: 'La stampa ti accosta a un trasferimento.',
    trigger: {
      all: [
        { field: 'hasClub', op: 'eq', value: true },
        { field: 'currentAbility', op: 'gte', value: 55 },
      ],
    },
    weight: 4,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'fuel',
        label: 'Alimenta le voci',
        consequences: { popularity: 30, stress: 5 },
      },
      {
        key: 'deny',
        label: 'Nega tutto',
        consequences: { stress: -2, reputation: 5 },
      },
    ],
  },
  {
    id: 'media-controversy',
    category: C.Media,
    title: 'Dichiarazione controversa',
    descriptionTemplate: 'Una tua frase viene estrapolata dal contesto.',
    trigger: { all: [{ field: 'popularity', op: 'gte', value: 200 }] },
    weight: 3,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'apologise',
        label: 'Scusati',
        consequences: { reputation: -5, popularity: -10, stress: 4 },
      },
      {
        key: 'double',
        label: 'Rilancia',
        consequences: { popularity: 20, reputation: -15, stress: 6 },
      },
    ],
  },
  {
    id: 'media-award-talk',
    category: C.Media,
    title: 'Si parla di premi',
    descriptionTemplate:
      'Gli opinionisti ti citano come candidato a un premio.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 75 }] },
    weight: 3,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'enjoy',
        label: 'Goditi l’entusiasmo',
        consequences: { morale: 6, popularity: 30 },
      },
      {
        key: 'ignore',
        label: 'Isola il rumore',
        consequences: { motivation: 4 },
      },
    ],
  },

  // ----------------------------------------------------------------- SPONSOR
  {
    id: 'sponsor-boots',
    category: C.Sponsor,
    title: 'Contratto scarpe',
    descriptionTemplate: 'Un marchio ti offre un contratto per le scarpe.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 400 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'sign',
        label: 'Firma il contratto',
        consequences: { money: 20000, popularity: 15 },
      },
      {
        key: 'wait',
        label: 'Aspetta un’offerta migliore',
        consequences: { stress: 2 },
      },
    ],
  },
  {
    id: 'sponsor-local',
    category: C.Sponsor,
    title: 'Sponsor locale',
    descriptionTemplate: 'Un’attività locale vuole sponsorizzarti.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'accept',
        label: 'Accetta',
        consequences: { money: 5000, popularity: 8 },
      },
      { key: 'decline', label: 'Rifiuta', consequences: { morale: 1 } },
    ],
  },
  {
    id: 'sponsor-risky',
    category: C.Sponsor,
    title: 'Marchio discutibile',
    descriptionTemplate: 'Un marchio controverso offre molti soldi.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 600 }] },
    weight: 3,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'take',
        label: 'Prendi i soldi',
        consequences: { money: 50000, reputation: -20 },
      },
      {
        key: 'refuse',
        label: 'Proteggi la tua immagine',
        consequences: { reputation: 10 },
      },
    ],
  },
  {
    id: 'sponsor-charity',
    category: C.Sponsor,
    title: 'Campagna benefica',
    descriptionTemplate:
      'Ti invitano a essere il volto di una campagna benefica.',
    trigger: { all: [{ field: 'popularity', op: 'gte', value: 150 }] },
    weight: 4,
    cooldownWeeks: 24,
    choices: [
      {
        key: 'lead',
        label: 'Guidala',
        consequences: { reputation: 20, popularity: 20, money: -3000 },
      },
      {
        key: 'support',
        label: 'Presta il tuo nome',
        consequences: { reputation: 8 },
      },
    ],
  },

  // ------------------------------------------------------------------ SALUTE
  {
    id: 'health-flu',
    category: C.Health,
    title: 'Influenza',
    descriptionTemplate: 'Un brutto virus ti mette ko per qualche giorno.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'rest',
        label: 'Riposa del tutto',
        consequences: { stress: -3, motivation: -2 },
      },
      {
        key: 'train',
        label: 'Allenati lo stesso',
        consequences: { stress: 4, mentalHealth: -2 },
      },
    ],
  },
  {
    id: 'health-nutrition',
    category: C.Health,
    title: 'Piano alimentare',
    descriptionTemplate: 'Un nutrizionista offre un piano su misura.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 15 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'commit',
        label: 'Impegnati al massimo',
        consequences: { motivation: 4, money: -1000 },
      },
      {
        key: 'ignore',
        label: 'Mangia ciò che vuoi',
        consequences: { happiness: 2, motivation: -2 },
      },
    ],
  },
  {
    id: 'health-burnout',
    category: C.Health,
    title: 'Segnali di esaurimento',
    descriptionTemplate: 'Ti senti mentalmente svuotato.',
    trigger: { all: [{ field: 'mentalHealth', op: 'lt', value: 45 }] },
    weight: 5,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'help',
        label: 'Cerca supporto',
        consequences: { mentalHealth: 10, stress: -8 },
      },
      {
        key: 'hide',
        label: 'Tieni tutto dentro',
        consequences: { mentalHealth: -5, stress: 5 },
      },
    ],
  },
  {
    id: 'health-sleep',
    category: C.Health,
    title: 'Problemi di sonno',
    descriptionTemplate: 'Lo stress ti tiene sveglio la notte.',
    trigger: { all: [{ field: 'stress', op: 'gte', value: 55 }] },
    weight: 4,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'routine',
        label: 'Sistema la routine',
        consequences: { stress: -6, mentalHealth: 4 },
      },
    ],
  },

  // ----------------------------------------------------------------- FINANZE
  {
    id: 'fin-first-wage',
    category: C.Finance,
    title: 'Primo vero stipendio',
    descriptionTemplate: 'Arriva la tua prima busta paga vera.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 4,
    cooldownWeeks: 52,
    maxOccurrencesPerCareer: 1,
    choices: [
      {
        key: 'save',
        label: 'Risparmia con giudizio',
        consequences: { money: 2000, happiness: 2 },
      },
      {
        key: 'spend',
        label: 'Concediti uno sfizio',
        consequences: { money: -1500, happiness: 6 },
      },
    ],
  },
  {
    id: 'fin-investment',
    category: C.Finance,
    title: 'Consiglio di investimento',
    descriptionTemplate: 'Un amico ti propone un’opportunità di investimento.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 18 }] },
    weight: 4,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'invest',
        label: 'Investi',
        consequences: { money: -10000, stress: 4 },
      },
      { key: 'pass', label: 'Lascia perdere', consequences: { morale: 1 } },
    ],
  },
  {
    id: 'fin-tax',
    category: C.Finance,
    title: 'Cartella esattoriale',
    descriptionTemplate: 'Arriva una tassa inattesa.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 400 }] },
    weight: 3,
    cooldownWeeks: 40,
    choices: [
      {
        key: 'pay',
        label: 'Pagala',
        consequences: { money: -8000, stress: 3 },
      },
    ],
  },
  {
    id: 'fin-car',
    category: C.Finance,
    title: 'Un’auto sportiva',
    descriptionTemplate: 'Adocchi l’auto dei tuoi sogni.',
    trigger: {
      all: [
        { field: 'age', op: 'gte', value: 18 },
        { field: 'reputation', op: 'gte', value: 300 },
      ],
    },
    weight: 3,
    cooldownWeeks: 40,
    choices: [
      {
        key: 'buy',
        label: 'Comprala',
        consequences: { money: -40000, happiness: 10, popularity: 10 },
      },
      {
        key: 'resist',
        label: 'Resisti',
        consequences: { money: 0, motivation: 2 },
      },
    ],
  },

  // --------------------------------------------------------------- COMPORTAMENTO
  {
    id: 'beh-late',
    category: C.Behaviour,
    title: 'In ritardo all’allenamento',
    descriptionTemplate: 'Ti svegli tardi e perdi l’inizio dell’allenamento.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'apologise',
        label: 'Scusati sinceramente',
        consequences: { reputation: -5, morale: -2 },
      },
      {
        key: 'excuse',
        label: 'Trova una scusa',
        consequences: { reputation: -12, stress: 3 },
      },
    ],
  },
  {
    id: 'beh-charity-visit',
    category: C.Behaviour,
    title: 'Visita in ospedale',
    descriptionTemplate:
      'Ti chiedono di visitare i bambini malati in ospedale.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 4,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'go',
        label: 'Vai volentieri',
        consequences: { reputation: 15, happiness: 6 },
      },
    ],
  },
  {
    id: 'beh-social-media',
    category: C.Behaviour,
    title: 'Scivolone sui social',
    descriptionTemplate: 'Un tuo post accende il dibattito.',
    trigger: { all: [{ field: 'popularity', op: 'gte', value: 100 }] },
    weight: 4,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'delete',
        label: 'Cancella e scusati',
        consequences: { popularity: -5, reputation: -3 },
      },
      {
        key: 'keep',
        label: 'Confermalo',
        consequences: { popularity: 15, reputation: -8 },
      },
    ],
  },
  {
    id: 'beh-discipline',
    category: C.Behaviour,
    title: 'Scontro nello spogliatoio',
    descriptionTemplate: 'Scoppia un acceso litigio.',
    trigger: { all: [{ field: 'stress', op: 'gte', value: 65 }] },
    weight: 3,
    cooldownWeeks: 18,
    choices: [
      {
        key: 'cool',
        label: 'Calma le acque',
        consequences: { stress: -5, reputation: 5 },
      },
      {
        key: 'escalate',
        label: 'Alza i toni',
        consequences: { stress: 6, reputation: -12 },
      },
    ],
  },
  {
    id: 'beh-professional',
    category: C.Behaviour,
    title: 'Professionalità extra',
    descriptionTemplate: 'Pensi di fare quel passo in più nella preparazione.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'commit',
        label: 'Impegnati',
        consequences: { motivation: 5, stress: 2 },
      },
      {
        key: 'relax',
        label: 'Resta rilassato',
        consequences: { happiness: 3 },
      },
    ],
  },
];
