import type { Prisma, PrismaClient } from '@prisma/client';
import type { EditablePlayer, PlayerEditInput } from '@football-life/shared';
import type { EditorRepository } from './editor-repository';

export class PrismaEditorRepository implements EditorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async load(saveGameId: string) {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save || !save.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { attributes: true } } },
    });
    if (!person || !person.player) return null;
    return { person, player: person.player };
  }

  async loadEditablePlayer(saveGameId: string): Promise<EditablePlayer | null> {
    const loaded = await this.load(saveGameId);
    if (!loaded) return null;
    const { person, player } = loaded;
    return {
      playerId: player.id,
      firstName: person.firstName,
      lastName: person.lastName,
      currentAbility: player.currentAbility,
      potentialAbility: player.potentialAbility,
      condition: player.condition,
      fatigue: player.fatigue,
      morale: player.morale,
      form: player.form,
      stress: player.stress,
      motivation: player.motivation,
      reputation: player.reputation,
      popularity: player.popularity,
      marketValue: player.marketValue,
      careerStatus: player.careerStatus,
      attributes: player.attributes
        .map((attribute) => ({
          key: attribute.attributeKey,
          value: attribute.value,
          category: attribute.category,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    };
  }

  async applyPlayerEdits(
    saveGameId: string,
    edits: PlayerEditInput,
  ): Promise<EditablePlayer | null> {
    const loaded = await this.load(saveGameId);
    if (!loaded) return null;
    const playerId = loaded.player.id;

    const data: Prisma.PlayerUpdateInput = {};
    if (edits.currentAbility !== undefined)
      data.currentAbility = edits.currentAbility;
    if (edits.potentialAbility !== undefined) {
      data.potentialAbility = edits.potentialAbility;
    }
    if (edits.condition !== undefined) data.condition = edits.condition;
    if (edits.fatigue !== undefined) data.fatigue = edits.fatigue;
    if (edits.morale !== undefined) data.morale = edits.morale;
    if (edits.form !== undefined) data.form = edits.form;
    if (edits.stress !== undefined) data.stress = edits.stress;
    if (edits.motivation !== undefined) data.motivation = edits.motivation;
    if (edits.reputation !== undefined) data.reputation = edits.reputation;
    if (edits.popularity !== undefined) data.popularity = edits.popularity;
    if (edits.marketValue !== undefined) data.marketValue = edits.marketValue;
    if (edits.careerStatus !== undefined)
      data.careerStatus = edits.careerStatus;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.player.update({ where: { id: playerId }, data });
      }
      for (const attribute of edits.attributes ?? []) {
        await tx.playerAttribute.updateMany({
          where: { playerId, attributeKey: attribute.key },
          data: { value: attribute.value },
        });
      }
    });

    return this.loadEditablePlayer(saveGameId);
  }
}
