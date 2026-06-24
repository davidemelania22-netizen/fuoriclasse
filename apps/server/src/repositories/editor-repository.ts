import type { EditablePlayer, PlayerEditInput } from '@football-life/shared';

export interface EditorRepository {
  loadEditablePlayer(saveGameId: string): Promise<EditablePlayer | null>;
  applyPlayerEdits(
    saveGameId: string,
    edits: PlayerEditInput,
  ): Promise<EditablePlayer | null>;
}
