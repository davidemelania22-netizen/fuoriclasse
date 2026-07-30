import type { WellbeingConfig } from '@football-life/shared';
import {
  addDays,
  applyTreatmentChoice,
  type InjuryTreatmentChoice,
} from '@football-life/simulation-engine';
import type { ProgressionRepository } from '../repositories/progression-repository';

export interface InjuryTreatmentDeps {
  repository: ProgressionRepository;
  wellbeingConfig: WellbeingConfig;
}

export interface InjuryTreatmentResult {
  weeksRemaining: number;
  recurrenceRisk: number;
}

/** Applies the player's chosen recovery plan to their currently active injury. */
export async function chooseInjuryTreatment(
  deps: InjuryTreatmentDeps,
  input: { saveGameId: string; choice: InjuryTreatmentChoice },
): Promise<InjuryTreatmentResult | null> {
  const snapshot = await deps.repository.loadProtagonist(input.saveGameId);
  if (
    !snapshot ||
    !snapshot.activeInjury ||
    snapshot.activeInjury.treatmentChoice
  ) {
    return null;
  }

  const effect = applyTreatmentChoice(
    {
      weeksRemaining: snapshot.activeInjury.weeksRemaining,
      recurrenceRisk: snapshot.activeInjury.recurrenceRisk,
    },
    input.choice,
    deps.wellbeingConfig,
  );

  await deps.repository.applyInjuryTreatment({
    injuryId: snapshot.activeInjury.id,
    treatmentChoice: input.choice,
    expectedEndAt: addDays(snapshot.currentDate, effect.weeksRemaining * 7),
    recurrenceRisk: effect.recurrenceRisk,
  });

  return effect;
}
