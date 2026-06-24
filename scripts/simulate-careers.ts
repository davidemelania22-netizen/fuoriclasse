import {
  mean,
  simulateCareer,
  type CareerOutcome,
} from '@football-life/simulation-engine';
import {
  DEFAULT_CAREER_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_RETIREMENT_CONFIG,
  DEFAULT_WELLBEING_CONFIG,
  INJURY_TYPES,
} from '@football-life/game-data';

const count = Number.parseInt(process.argv[2] ?? '300', 10);
const injuryTypeKeys = INJURY_TYPES.map((type) => type.key);

const minOf = (values: number[]): number =>
  values.reduce((m, v) => (v < m ? v : m), Infinity);
const maxOf = (values: number[]): number =>
  values.reduce((m, v) => (v > m ? v : m), -Infinity);

const outcomes: CareerOutcome[] = [];
for (let i = 0; i < count; i += 1) {
  outcomes.push(
    simulateCareer({
      seed: `batch-${i}`,
      progressionConfig: DEFAULT_PROGRESSION_CONFIG,
      wellbeingConfig: DEFAULT_WELLBEING_CONFIG,
      careerConfig: DEFAULT_CAREER_CONFIG,
      retirementConfig: DEFAULT_RETIREMENT_CONFIG,
      injuryTypeKeys,
    }),
  );
}

const peaks = outcomes.map((o) => o.peakAbility);
const retirementAges = outcomes.map((o) => o.retirementAge);
const injuries = outcomes.map((o) => o.totalInjuries);
const marketValues = outcomes.map((o) => o.peakMarketValue);
const legacy = outcomes.map((o) => o.legacyScore);
const elite = outcomes.filter((o) => o.peakAbility >= 80).length;
const good = outcomes.filter(
  (o) => o.peakAbility >= 70 && o.peakAbility < 80,
).length;

const diverged = outcomes.filter(
  (o) =>
    !Number.isFinite(o.peakAbility) ||
    o.peakAbility > 99 ||
    o.retirementAge > 42 ||
    o.finalAbility > o.peakAbility,
);

console.log(`Simulated ${count} full careers (age 14 -> retirement)\n`);
console.log(
  `Peak ability    : mean ${mean(peaks).toFixed(1)}  [${minOf(peaks)}..${maxOf(peaks)}]`,
);
console.log(
  `Retirement age  : mean ${mean(retirementAges).toFixed(1)}  [${minOf(retirementAges)}..${maxOf(retirementAges)}]`,
);
console.log(
  `Injuries/career : mean ${mean(injuries).toFixed(1)}  max ${maxOf(injuries)}`,
);
console.log(
  `Peak value      : mean €${(mean(marketValues) / 1e6).toFixed(2)}M  max €${(maxOf(marketValues) / 1e6).toFixed(2)}M`,
);
console.log(
  `Legacy score    : mean ${mean(legacy).toFixed(0)}  max ${maxOf(legacy)}`,
);
console.log(
  `Distribution    : elite(>=80) ${elite} · good(70-79) ${good} · other ${count - elite - good}`,
);

if (diverged.length > 0) {
  console.error(`\nDIVERGENCE detected in ${diverged.length} career(s).`);
  process.exit(1);
}
console.log('\nNo statistical divergence detected.');
