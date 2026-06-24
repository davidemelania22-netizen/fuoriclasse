// Italian display labels for codes/enums used across the UI.

export const positionLabels: Record<string, string> = {
  GK: 'Portiere',
  DF: 'Difensore',
  MF: 'Centrocampista',
  WG: 'Ala',
  FW: 'Attaccante',
};

export const footLabels: Record<string, string> = {
  LEFT: 'Sinistro',
  RIGHT: 'Destro',
  BOTH: 'Ambidestro',
};

export const countryLabels: Record<string, string> = {
  IT: 'Italia',
  EN: 'Inghilterra',
  ES: 'Spagna',
  FR: 'Francia',
  US: 'Stati Uniti',
};

export const careerStatusLabels: Record<string, string> = {
  YOUTH: 'Settore giovanile',
  ACTIVE: 'In attività',
  INJURED: 'Infortunato',
  RETIRED: 'Ritirato',
  UNEMPLOYED: 'Svincolato',
};

export const intensityLabels: Record<string, string> = {
  REST: 'Riposo',
  LIGHT: 'Leggero',
  NORMAL: 'Normale',
  INTENSE: 'Intenso',
};

export const eventCategoryLabels: Record<string, string> = {
  FOOTBALL: 'Calcio',
  COACH: 'Allenatore',
  TEAMMATES: 'Compagni',
  FAMILY: 'Famiglia',
  SCHOOL: 'Scuola',
  LOVE: 'Amore',
  AGENT: 'Procuratore',
  MEDIA: 'Media',
  SPONSOR: 'Sponsor',
  HEALTH: 'Salute',
  FINANCE: 'Finanze',
  BEHAVIOUR: 'Comportamento',
};

export const attributeCategoryLabels: Record<string, string> = {
  TECHNICAL: 'Tecnici',
  PHYSICAL: 'Fisici',
  MENTAL: 'Mentali',
  HIDDEN: 'Nascosti',
};

export const attributeLabels: Record<string, string> = {
  ballControl: 'Controllo palla',
  shortPassing: 'Passaggio corto',
  longPassing: 'Passaggio lungo',
  finishing: 'Finalizzazione',
  longShots: 'Tiro dalla distanza',
  dribbling: 'Dribbling',
  crossing: 'Cross',
  heading: 'Colpo di testa',
  marking: 'Marcatura',
  tackling: 'Contrasti',
  technique: 'Tecnica',
  setPieces: 'Calci piazzati',
  penalties: 'Rigori',
  firstTouch: 'Primo controllo',
  acceleration: 'Accelerazione',
  pace: 'Velocità',
  strength: 'Forza',
  stamina: 'Resistenza',
  agility: 'Agilità',
  balance: 'Equilibrio',
  jumping: 'Elevazione',
  coordination: 'Coordinazione',
  physicalRecovery: 'Recupero fisico',
  injuryResistance: 'Resistenza agli infortuni',
  concentration: 'Concentrazione',
  decisions: 'Decisioni',
  vision: 'Visione di gioco',
  anticipation: 'Anticipazione',
  composure: 'Freddezza',
  determination: 'Determinazione',
  discipline: 'Disciplina',
  leadership: 'Leadership',
  bravery: 'Coraggio',
  creativity: 'Creatività',
  professionalism: 'Professionalità',
  ambition: 'Ambizione',
  pressureHandling: 'Gestione pressione',
  adaptability: 'Adattabilità',
  developmentSpeed: 'Velocità di sviluppo',
  expectedPeakAge: 'Età di picco prevista',
  injuryProneness: 'Predisposizione infortuni',
  emotionalStability: 'Stabilità emotiva',
  loyalty: 'Lealtà',
  greed: 'Avidità',
  competitiveness: 'Competitività',
  pressureTolerance: 'Tolleranza alla pressione',
  riskTaking: 'Propensione al rischio',
  socialInfluence: 'Influenza sociale',
  behaviouralRisk: 'Rischio comportamentale',
};

export function label(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
