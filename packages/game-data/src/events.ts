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
      'Una grande settimana sul campo attira l’attenzione su {firstName}.',
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
    descriptionTemplate:
      'Niente gira in allenamento questa settimana per {firstName}.',
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
        consequences: { stress: 4 },
        gamble: {
          successChance: 0.72,
          successLabel:
            'Palla nell’angolo, portiere spiazzato: da oggi i rigori sono i tuoi.',
          failureLabel:
            'Traversa. Lo stadio ammutolisce e tu resti lì impalato.',
          success: { reputation: 45, morale: 6, popularity: 20 },
          failure: { reputation: -25, morale: -10, stress: 6 },
        },
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
        gamble: {
          successChance: 0.5,
          successLabel:
            'Tutto il tempo al campo paga: ti alleni come un professionista e si vede.',
          failureLabel:
            'Senza altro a cui pensare, ogni brutta settimana ti pesa il doppio.',
          success: { motivation: 8, morale: 5 },
          failure: { mentalHealth: -10, stress: 8 },
        },
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
        label: 'Rifiuta e tieni duro',
        consequences: { stress: 5 },
        gamble: {
          successChance: 0.55,
          successLabel:
            'Il procuratore fa marcia indietro: la commissione resta quella di prima.',
          failureLabel:
            'Ti molla in pieno mercato: trovarne un altro ti costa tempo e occasioni.',
          success: { money: 3000, motivation: 4 },
          failure: { reputation: -20, stress: 8, morale: -5 },
        },
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
        consequences: { stress: 6 },
        gamble: {
          successChance: 0.4,
          successLabel:
            'La tua faccia tosta piace: i tifosi ti adottano come simbolo.',
          failureLabel:
            'Rilanciare era la mossa sbagliata: ora la frase te la ricorderanno per anni.',
          success: { popularity: 55, reputation: 15 },
          failure: { popularity: -15, reputation: -45, mentalHealth: -5 },
        },
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
        consequences: { money: 50000 },
        gamble: {
          successChance: 0.5,
          successLabel:
            'Nessuno fa caso al marchio: incassi e la cosa finisce lì.',
          failureLabel:
            'I giornali tirano fuori i panni sporchi dello sponsor e il tuo nome ci finisce in mezzo.',
          success: { happiness: 4 },
          failure: { reputation: -60, popularity: -25, stress: 8 },
        },
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
        label: 'Investi 10.000 €',
        consequences: { money: -10000, stress: 4 },
        gamble: {
          successChance: 0.4,
          successLabel:
            'L’affare gira: il tuo amico ti richiama con una cifra a cinque zeri.',
          failureLabel:
            'L’affare evapora e con lui i tuoi soldi. Almeno hai imparato qualcosa.',
          success: { money: 45000, happiness: 6 },
          failure: { stress: 6, happiness: -5 },
        },
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
        consequences: { stress: 3 },
        gamble: {
          successChance: 0.45,
          successLabel:
            'Il web ti dà ragione: diventi quello che dice le cose come stanno.',
          failureLabel:
            'Ti travolgono. Il club ti convoca e ti chiede conto del post.',
          success: { popularity: 45, reputation: 10 },
          failure: { popularity: -20, reputation: -35, morale: -6 },
        },
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

  // ------------------------------------------------ EVENTI SITUAZIONALI (vivi)
  {
    id: 'sit-hot-streak',
    category: C.Media,
    title: 'In gran forma',
    descriptionTemplate:
      'Sei in un grande momento: la stampa elogia le prestazioni di {firstName} in {leagueName}.',
    trigger: { all: [{ field: 'form', op: 'gte', value: 70 }] },
    weight: 9,
    cooldownWeeks: 6,
    choices: [
      {
        key: 'humble',
        label: 'Resta con i piedi per terra',
        consequences: { morale: 4, motivation: 3 },
      },
      {
        key: 'enjoy',
        label: 'Goditi i riflettori',
        consequences: { popularity: 6, happiness: 4, stress: 2 },
      },
    ],
  },
  {
    id: 'sit-form-slump',
    category: C.Football,
    title: 'Crisi di forma',
    descriptionTemplate:
      'Le prestazioni calano e al {clubName} qualcuno mormora. {firstName} deve reagire.',
    trigger: {
      all: [
        { field: 'form', op: 'lte', value: 35 },
        { field: 'hasClub', op: 'eq', value: true },
      ],
    },
    weight: 8,
    cooldownWeeks: 6,
    choices: [
      {
        key: 'work',
        label: 'Lavora il doppio',
        consequences: { motivation: 5, stress: 5 },
      },
      {
        key: 'clear',
        label: 'Libera la testa',
        consequences: { stress: -6, morale: 3 },
      },
    ],
  },
  {
    id: 'sit-injury-recovery',
    category: C.Health,
    title: 'In sala medica',
    descriptionTemplate:
      'Il recupero dall’infortunio al {clubName} procede. Lo staff medico raccomanda prudenza.',
    trigger: { all: [{ field: 'isInjured', op: 'eq', value: true }] },
    weight: 12,
    cooldownWeeks: 3,
    choices: [
      {
        key: 'rush',
        label: 'Affretta il rientro',
        consequences: { motivation: 4, stress: 6 },
      },
      {
        key: 'careful',
        label: 'Segui i tempi dello staff',
        consequences: { mentalHealth: 4, morale: 3 },
      },
    ],
  },
  {
    id: 'sit-preseason',
    category: C.Football,
    title: 'Ritiro pre-campionato',
    descriptionTemplate:
      'Il {clubName} apre la preparazione: è il momento di mettere benzina nelle gambe.',
    trigger: {
      all: [
        { field: 'seasonPhase', op: 'eq', value: 'PRESEASON' },
        { field: 'hasClub', op: 'eq', value: true },
      ],
    },
    weight: 10,
    cooldownWeeks: 40,
    choices: [
      {
        key: 'grind',
        label: 'Spingi al massimo',
        consequences: { motivation: 5, stress: 3 },
      },
      {
        key: 'smart',
        label: 'Lavora con criterio',
        consequences: { morale: 3, motivation: 2 },
      },
    ],
  },
  {
    id: 'sit-run-in',
    category: C.Football,
    title: 'Volata finale',
    descriptionTemplate:
      'La stagione in {leagueName} entra nel vivo: ogni partita pesa.',
    trigger: {
      all: [
        { field: 'seasonPhase', op: 'eq', value: 'RUN_IN' },
        { field: 'hasClub', op: 'eq', value: true },
      ],
    },
    weight: 9,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'push',
        label: 'Dai tutto',
        consequences: { motivation: 5, stress: 4 },
      },
      {
        key: 'manage',
        label: 'Gestisci le energie',
        consequences: { stress: -4, morale: 2 },
      },
    ],
  },
  {
    id: 'sit-winter-rumors',
    category: C.Agent,
    title: 'Voci di mercato',
    descriptionTemplate:
      'Mercato di gennaio: si parla di {firstName} fuori dal {clubName}.',
    trigger: {
      all: [
        { field: 'seasonPhase', op: 'eq', value: 'WINTER_WINDOW' },
        { field: 'hasClub', op: 'eq', value: true },
        { field: 'currentAbility', op: 'gte', value: 45 },
      ],
    },
    weight: 8,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'focus',
        label: 'Testa solo al campo',
        consequences: { motivation: 4, morale: 2 },
      },
      {
        key: 'flattered',
        label: 'Lusingato dall’interesse',
        consequences: { happiness: 4, popularity: 3, stress: 3 },
      },
    ],
  },
  {
    id: 'sit-contract-final-year',
    category: C.Agent,
    title: 'Ultimo anno di contratto',
    descriptionTemplate:
      'Il tuo accordo con il {clubName} scade tra poco: il tuo agente valuta le mosse.',
    trigger: {
      all: [
        { field: 'hasClub', op: 'eq', value: true },
        { field: 'contractYearsLeft', op: 'lte', value: 1 },
      ],
    },
    weight: 7,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'renew',
        label: 'Chiedi il rinnovo',
        consequences: { morale: 3, motivation: 3 },
      },
      {
        key: 'wait',
        label: 'Aspetta offerte migliori',
        consequences: { stress: 3, popularity: 2 },
      },
    ],
  },
  {
    id: 'sit-exhaustion',
    category: C.Health,
    title: 'Sfinito',
    descriptionTemplate:
      'Settimane intense ti hanno svuotato: {firstName} è sull’orlo dell’affaticamento.',
    trigger: { all: [{ field: 'fatigue', op: 'gte', value: 70 }] },
    weight: 9,
    cooldownWeeks: 5,
    choices: [
      {
        key: 'rest',
        label: 'Riposa davvero',
        consequences: { stress: -6, happiness: 4 },
      },
      {
        key: 'tough',
        label: 'Stringi i denti',
        consequences: { motivation: 3, stress: 5 },
      },
    ],
  },
  {
    id: 'sit-rising-star',
    category: C.Media,
    title: 'Giovane promessa',
    descriptionTemplate:
      'Il tuo nome circola: {firstName} è tra i talenti emergenti di {leagueName}.',
    trigger: {
      all: [
        { field: 'hasClub', op: 'eq', value: true },
        { field: 'age', op: 'lte', value: 21 },
        { field: 'currentAbility', op: 'gte', value: 55 },
      ],
    },
    weight: 6,
    cooldownWeeks: 18,
    choices: [
      {
        key: 'ground',
        label: 'Lavora in silenzio',
        consequences: { motivation: 4, morale: 2 },
      },
      {
        key: 'embrace',
        label: 'Cavalca l’hype',
        consequences: { popularity: 7, stress: 3 },
      },
    ],
  },

  // -------------------------------------------- GIORNALI / STILE DI VITA
  {
    id: 'life-playboy-gossip',
    category: C.Media,
    title: 'Gossip in prima pagina',
    descriptionTemplate:
      'I giornali sbattono in copertina la vita sentimentale di {firstName}.',
    trigger: { all: [{ field: 'lifestyle', op: 'eq', value: 'PLAYBOY' }] },
    weight: 10,
    cooldownWeeks: 6,
    choices: [
      {
        key: 'enjoy',
        label: 'Goditi i riflettori',
        consequences: { popularity: 8, happiness: 4, stress: 4 },
      },
      {
        key: 'deny',
        label: 'Smentisci tutto',
        consequences: { mentalHealth: 4, popularity: -4, stress: -2 },
      },
    ],
  },
  {
    id: 'life-family-portrait',
    category: C.Media,
    title: 'Ritratto di famiglia',
    descriptionTemplate:
      'Una rivista dipinge {firstName} come un modello di serietà e famiglia.',
    trigger: { all: [{ field: 'lifestyle', op: 'eq', value: 'FAMILY' }] },
    weight: 10,
    cooldownWeeks: 6,
    choices: [
      {
        key: 'embrace',
        label: 'Apri le porte di casa',
        consequences: { happiness: 6, mentalHealth: 4, popularity: 3 },
      },
      {
        key: 'private',
        label: 'Difendi la privacy',
        consequences: { mentalHealth: 6, popularity: -2 },
      },
    ],
  },
  {
    id: 'life-party-scandal',
    category: C.Media,
    title: 'Foto notturne',
    descriptionTemplate:
      'Scatti di {firstName} a una festa fino all’alba finiscono sui giornali.',
    trigger: { all: [{ field: 'lifestyle', op: 'eq', value: 'PARTY' }] },
    weight: 10,
    cooldownWeeks: 5,
    choices: [
      {
        key: 'partyon',
        label: 'Nessun rimpianto',
        consequences: { happiness: 5, stress: 5 },
        gamble: {
          successChance: 0.5,
          successLabel:
            'Passa come una serata come tante: nessuno ci costruisce sopra un caso.',
          failureLabel:
            'La foto diventa una copertina e il club ti multa per comportamento non professionale.',
          success: { popularity: 25 },
          failure: { money: -15000, reputation: -30, morale: -6 },
        },
      },
      {
        key: 'laylow',
        label: 'Scuse e basso profilo',
        consequences: { mentalHealth: 5, motivation: 3, popularity: -5 },
      },
    ],
  },
  {
    id: 'life-pro-respect',
    category: C.Media,
    title: 'Elogio alla professionalità',
    descriptionTemplate:
      'La stampa loda la dedizione e la disciplina di {firstName}.',
    trigger: { all: [{ field: 'lifestyle', op: 'eq', value: 'PROFESSIONAL' }] },
    weight: 9,
    cooldownWeeks: 6,
    choices: [
      {
        key: 'focus',
        label: 'Resta concentrato',
        consequences: { motivation: 6, mentalHealth: 3 },
      },
      {
        key: 'credit',
        label: 'Ringrazia lo staff',
        consequences: { morale: 4, popularity: 3 },
      },
    ],
  },
];
