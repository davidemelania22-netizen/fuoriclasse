import type { EditablePlayer, PlayerEditInput } from '@football-life/shared';
import { clamp } from '@football-life/simulation-engine';
import type { EditorRepository } from '../repositories/editor-repository';

const bounded = (value: number, lo: number, hi: number): number =>
  clamp(Math.round(value), lo, hi);

/** Clamp every edited field to its valid range before persisting. */
function sanitize(edits: PlayerEditInput): PlayerEditInput {
  const out: PlayerEditInput = {};
  if (edits.currentAbility !== undefined) {
    out.currentAbility = bounded(edits.currentAbility, 1, 99);
  }
  if (edits.potentialAbility !== undefined) {
    out.potentialAbility = bounded(edits.potentialAbility, 1, 99);
  }
  if (edits.condition !== undefined)
    out.condition = bounded(edits.condition, 0, 100);
  if (edits.fatigue !== undefined) out.fatigue = bounded(edits.fatigue, 0, 100);
  if (edits.morale !== undefined) out.morale = bounded(edits.morale, 0, 100);
  if (edits.form !== undefined) out.form = bounded(edits.form, 0, 100);
  if (edits.stress !== undefined) out.stress = bounded(edits.stress, 0, 100);
  if (edits.motivation !== undefined) {
    out.motivation = bounded(edits.motivation, 0, 100);
  }
  if (edits.reputation !== undefined) {
    out.reputation = bounded(edits.reputation, 0, 10000);
  }
  if (edits.popularity !== undefined) {
    out.popularity = bounded(edits.popularity, 0, 10000);
  }
  if (edits.marketValue !== undefined) {
    out.marketValue = Math.max(0, Math.round(edits.marketValue));
  }
  if (edits.careerStatus !== undefined) out.careerStatus = edits.careerStatus;
  if (edits.attributes !== undefined) {
    out.attributes = edits.attributes.map((attribute) => ({
      key: attribute.key,
      value: bounded(attribute.value, 1, 99),
    }));
  }
  return out;
}

export interface EditorDeps {
  repository: EditorRepository;
}

export async function loadEditablePlayer(
  deps: EditorDeps,
  saveGameId: string,
): Promise<EditablePlayer | null> {
  return deps.repository.loadEditablePlayer(saveGameId);
}

export async function editPlayer(
  deps: EditorDeps,
  input: { saveGameId: string; edits: PlayerEditInput },
): Promise<EditablePlayer | null> {
  return deps.repository.applyPlayerEdits(
    input.saveGameId,
    sanitize(input.edits),
  );
}
