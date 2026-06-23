import { AttributeCategory } from './enums';

export interface AttributeDefinition {
  key: string;
  category: AttributeCategory;
}

const TECHNICAL_KEYS = [
  'ballControl',
  'shortPassing',
  'longPassing',
  'finishing',
  'longShots',
  'dribbling',
  'crossing',
  'heading',
  'marking',
  'tackling',
  'technique',
  'setPieces',
  'penalties',
  'firstTouch',
] as const;

const PHYSICAL_KEYS = [
  'acceleration',
  'pace',
  'strength',
  'stamina',
  'agility',
  'balance',
  'jumping',
  'coordination',
  'physicalRecovery',
  'injuryResistance',
] as const;

const MENTAL_KEYS = [
  'concentration',
  'decisions',
  'vision',
  'anticipation',
  'composure',
  'determination',
  'discipline',
  'leadership',
  'bravery',
  'creativity',
  'professionalism',
  'ambition',
  'pressureHandling',
  'adaptability',
] as const;

const HIDDEN_KEYS = [
  'developmentSpeed',
  'expectedPeakAge',
  'injuryProneness',
  'emotionalStability',
  'loyalty',
  'greed',
  'competitiveness',
  'pressureTolerance',
  'riskTaking',
  'socialInfluence',
  'behaviouralRisk',
] as const;

export const ATTRIBUTE_DEFINITIONS: readonly AttributeDefinition[] = [
  ...TECHNICAL_KEYS.map((key) => ({
    key,
    category: AttributeCategory.Technical,
  })),
  ...PHYSICAL_KEYS.map((key) => ({
    key,
    category: AttributeCategory.Physical,
  })),
  ...MENTAL_KEYS.map((key) => ({ key, category: AttributeCategory.Mental })),
  ...HIDDEN_KEYS.map((key) => ({ key, category: AttributeCategory.Hidden })),
];

export const ATTRIBUTE_KEYS = ATTRIBUTE_DEFINITIONS.map((a) => a.key);
