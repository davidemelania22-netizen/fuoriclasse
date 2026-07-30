import type { ShopItem } from '@football-life/shared';

/**
 * Purchasable items, license-free. Effects are one-off, clamped deltas applied
 * on purchase: wellbeing stats on 0-100, popularity and reputation on 0-10000
 * (the same scale the rest of the game uses).
 *
 * The price ladder is the progression: the €25k starting wallet buys a couple
 * of cheap boosts, while the mansion and the private jet are things only a
 * career at the top can pay for. Every item's `key` also names its
 * illustration in the web app, so keys must stay stable.
 */
export const SHOP_ITEMS: ShopItem[] = [
  // ------------------------------------------------------------- ATTREZZATURA
  {
    key: 'shin-guards',
    name: 'Parastinchi su misura',
    description: 'Protezioni leggere stampate sulla forma della tua gamba.',
    category: 'EQUIPMENT',
    price: 1_500,
    effects: { condition: 3, morale: 2 },
  },
  {
    key: 'compression-kit',
    name: 'Completo a compressione',
    description: 'Sottomaglia tecnica che tiene i muscoli caldi e sostenuti.',
    category: 'EQUIPMENT',
    price: 2_000,
    effects: { fatigue: -6, condition: 3 },
  },
  {
    key: 'custom-boots',
    name: 'Scarpini su misura',
    description: 'Calzature personalizzate per rendere al meglio in campo.',
    category: 'EQUIPMENT',
    price: 3_000,
    effects: { condition: 6, motivation: 3 },
  },
  {
    key: 'altitude-mask',
    name: 'Maschera per l’altura',
    description:
      'Allenamento in ipossia: il fiato cresce, ma si paga in fatica.',
    category: 'EQUIPMENT',
    price: 4_000,
    effects: { condition: 9, fatigue: 6 },
  },
  {
    key: 'recovery-tech',
    name: 'Attrezzatura di recupero',
    description: 'Stivali a compressione e rullo per smaltire la fatica.',
    category: 'EQUIPMENT',
    price: 5_000,
    effects: { fatigue: -12, condition: 4 },
  },
  {
    key: 'boot-collection',
    name: 'Collezione di scarpini',
    description: 'Un paio per ogni terreno, e qualche modello da esibire.',
    category: 'EQUIPMENT',
    price: 12_000,
    effects: { motivation: 5, popularity: 35 },
  },

  // ---------------------------------------------------------------- BENESSERE
  {
    key: 'nutritionist',
    name: 'Nutrizionista',
    description: 'Un piano alimentare costruito sui tuoi carichi di lavoro.',
    category: 'WELLNESS',
    price: 6_000,
    effects: { condition: 8, fatigue: -4 },
  },
  {
    key: 'sleep-clinic',
    name: 'Clinica del sonno',
    description: 'Dormire bene è il primo allenamento della giornata.',
    category: 'WELLNESS',
    price: 7_000,
    effects: { fatigue: -8, mentalHealth: 6, stress: -5 },
  },
  {
    key: 'physio-session',
    name: 'Sedute dal fisioterapista',
    description: 'Un ciclo di trattamenti per rimettere a posto il fisico.',
    category: 'WELLNESS',
    price: 8_000,
    effects: { fatigue: -10, stress: -6, condition: 5 },
  },
  {
    key: 'cryotherapy',
    name: 'Crioterapia',
    description: 'Tre minuti a −110 gradi: i muscoli tornano nuovi.',
    category: 'WELLNESS',
    price: 10_000,
    effects: { fatigue: -16, condition: 6 },
  },
  {
    key: 'yoga-retreat',
    name: 'Ritiro di yoga',
    description:
      'Una settimana lontano da tutto per rimettere la testa a posto.',
    category: 'WELLNESS',
    price: 11_000,
    effects: { stress: -12, mentalHealth: 8, happiness: 5 },
  },
  {
    key: 'mental-coach',
    name: 'Mental coach',
    description: 'Un professionista per gestire pressione e concentrazione.',
    category: 'WELLNESS',
    price: 12_000,
    effects: { mentalHealth: 10, stress: -8 },
  },
  {
    key: 'massage-therapist',
    name: 'Massaggiatore personale',
    description: 'Mani esperte a disposizione dopo ogni partita.',
    category: 'WELLNESS',
    price: 14_000,
    effects: { fatigue: -14, stress: -6, condition: 5 },
  },

  // -------------------------------------------------------------- ALLENAMENTO
  {
    key: 'language-tutor',
    name: 'Insegnante di lingue',
    description:
      'Capire lo spogliatoio cambia tutto, soprattutto lontano da casa.',
    category: 'TRAINING',
    price: 4_000,
    effects: { mentalHealth: 6, morale: 4 },
  },
  {
    key: 'personal-trainer',
    name: 'Preparatore personale',
    description: 'Lavoro extra costruito solo su di te, tutta la settimana.',
    category: 'TRAINING',
    price: 15_000,
    effects: { condition: 12, motivation: 6 },
  },
  {
    key: 'video-analyst',
    name: 'Analista video',
    description: 'Rivedi ogni tuo movimento e correggi quello che non vedi.',
    category: 'TRAINING',
    price: 18_000,
    effects: { motivation: 10, reputation: 25 },
  },
  {
    key: 'set-piece-coach',
    name: 'Specialista dei piazzati',
    description: 'Un ex campione ti insegna a battere punizioni e rigori.',
    category: 'TRAINING',
    price: 22_000,
    effects: { motivation: 8, reputation: 35 },
  },
  {
    key: 'private-pitch',
    name: 'Campo privato',
    description: 'Un campo tutto tuo: ci vai quando vuoi, anche di notte.',
    category: 'TRAINING',
    price: 45_000,
    effects: { condition: 10, motivation: 8 },
  },

  // ----------------------------------------------------------------- IMMAGINE
  {
    key: 'photoshoot',
    name: 'Servizio fotografico',
    description: 'Un book professionale che gira su tutte le testate.',
    category: 'MEDIA',
    price: 6_000,
    effects: { popularity: 40, happiness: 3 },
  },
  {
    key: 'fan-club',
    name: 'Fan club ufficiale',
    description: 'Dai una casa a chi ti segue: tessere, raduni, magliette.',
    category: 'MEDIA',
    price: 8_000,
    effects: { popularity: 60, happiness: 5 },
  },
  {
    key: 'social-manager',
    name: 'Social media manager',
    description: 'Qualcuno che cura i tuoi profili e ti evita le figuracce.',
    category: 'MEDIA',
    price: 16_000,
    effects: { popularity: 90, reputation: 40 },
  },
  {
    key: 'pr-agency',
    name: 'Agenzia di comunicazione',
    description: 'Un ufficio stampa che lavora per far parlare bene di te.',
    category: 'MEDIA',
    price: 40_000,
    effects: { reputation: 90, popularity: 140 },
  },
  {
    key: 'documentary',
    name: 'Documentario sulla tua vita',
    description:
      'Una troupe racconta la tua storia: ti vedranno in tutto il mondo.',
    category: 'MEDIA',
    price: 90_000,
    effects: { popularity: 250, reputation: 160, happiness: 6 },
  },

  // --------------------------------------------------------------------- CASA
  {
    key: 'home-gym',
    name: 'Palestra in casa',
    description: 'Pesi, tapis roulant e specchi: nessuna scusa per saltare.',
    category: 'HOME',
    price: 25_000,
    effects: { condition: 10, motivation: 5 },
  },
  {
    key: 'sauna-pool',
    name: 'Sauna e piscina',
    description: 'Recupero attivo a casa tua, senza prenotare niente.',
    category: 'HOME',
    price: 35_000,
    effects: { fatigue: -12, stress: -8, happiness: 6 },
  },
  {
    key: 'city-apartment',
    name: 'Appartamento in centro',
    description: 'Dieci minuti dal campo e la città sotto le finestre.',
    category: 'HOME',
    price: 60_000,
    effects: { happiness: 12, stress: -6 },
  },
  {
    key: 'mansion',
    name: 'Villa con vista',
    description:
      'La casa che si fotografa dall’elicottero. Costa come sembra.',
    category: 'HOME',
    price: 250_000,
    effects: { happiness: 20, popularity: 80 },
  },

  // ----------------------------------------------------------------- FAMIGLIA
  {
    key: 'family-holiday',
    name: 'Vacanza con la famiglia',
    description: 'Due settimane con chi ti ha portato fin qui.',
    category: 'FAMILY',
    price: 13_000,
    effects: { happiness: 14, stress: -10, mentalHealth: 6 },
  },
  {
    key: 'mum-car',
    name: 'Un’auto per tua madre',
    description: 'Il regalo che ti immaginavi di farle da quando eri bambino.',
    category: 'FAMILY',
    price: 30_000,
    effects: { happiness: 12, mentalHealth: 6 },
  },
  {
    key: 'parents-house',
    name: 'Una casa per i tuoi genitori',
    description: 'Le chiavi sul tavolo, senza dire niente. Ripaga tutto.',
    category: 'FAMILY',
    price: 120_000,
    effects: { happiness: 22, mentalHealth: 12 },
  },

  // ------------------------------------------------------------ STILE DI VITA
  {
    key: 'short-holiday',
    name: 'Vacanza breve',
    description: 'Qualche giorno di stacco per ricaricare le pile.',
    category: 'LIFESTYLE',
    price: 9_000,
    effects: { happiness: 12, stress: -10, fatigue: -6 },
  },
  {
    key: 'charity-event',
    name: 'Evento di beneficenza',
    description: 'Organizzi un’iniziativa benefica: i tifosi ti adorano.',
    category: 'LIFESTYLE',
    price: 15_000,
    effects: { popularity: 45, happiness: 4 },
  },
  {
    key: 'personal-chef',
    name: 'Chef personale',
    description: 'Alimentazione curata su misura per le tue esigenze.',
    category: 'LIFESTYLE',
    price: 20_000,
    effects: { condition: 10, happiness: 6 },
  },
  {
    key: 'luxury-watch',
    name: 'Orologio di lusso',
    description: 'Al polso in ogni intervista. Si nota, ed è il punto.',
    category: 'LIFESTYLE',
    price: 45_000,
    effects: { happiness: 10, popularity: 70 },
  },
  {
    key: 'sports-car',
    name: 'Auto sportiva',
    description: 'Una macchina da sogno: tanta immagine, tanto esborso.',
    category: 'LIFESTYLE',
    price: 80_000,
    effects: { happiness: 15, popularity: 55 },
  },
  {
    key: 'foundation',
    name: 'Fondazione a tuo nome',
    description: 'Non un evento: una struttura che lavora tutto l’anno.',
    category: 'LIFESTYLE',
    price: 150_000,
    effects: { reputation: 200, popularity: 120, happiness: 10 },
  },
  {
    key: 'private-jet',
    name: 'Jet privato',
    description: 'Trasferte senza aeroporti: arrivi riposato e si vede.',
    category: 'LIFESTYLE',
    price: 400_000,
    effects: { happiness: 18, popularity: 150, fatigue: -10 },
  },

  // ------------------------------------------------------------------- GADGET
  {
    key: 'noise-headphones',
    name: 'Cuffie a cancellazione',
    description: 'Il tuo silenzio portatile prima di entrare in campo.',
    category: 'GADGET',
    price: 1_200,
    effects: { stress: -6, mentalHealth: 4 },
  },
  {
    key: 'game-console',
    name: 'Console e videogiochi',
    description: 'Staccare la testa la sera, come fanno tutti i tuoi compagni.',
    category: 'GADGET',
    price: 1_800,
    effects: { happiness: 8, stress: -5 },
  },
  {
    key: 'training-watch',
    name: 'Smartwatch da allenamento',
    description: 'Monitori carichi e sonno: ti alleni con più criterio.',
    category: 'GADGET',
    price: 2_500,
    effects: { motivation: 6 },
  },
  {
    key: 'vr-reaction-trainer',
    name: 'Visore per i riflessi',
    description:
      'Esercizi in realtà virtuale per decidere mezzo secondo prima.',
    category: 'GADGET',
    price: 5_500,
    effects: { motivation: 8, condition: 3 },
  },
];
