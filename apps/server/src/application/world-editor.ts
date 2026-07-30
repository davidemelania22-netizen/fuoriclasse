import { z } from 'zod';
import type {
  EditableWorld,
  WorldEditorRepository,
} from '../repositories/world-editor-repository';

// Crests are small client-resized images; cap the data URL well below the
// avatar limit since these render at list size.
const logoSchema = z
  .string()
  .startsWith('data:image/')
  .max(300_000)
  .nullable();

export const clubEditSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    shortName: z.string().trim().min(2).max(4).optional(),
    logo: logoSchema.optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.shortName !== undefined ||
      body.logo !== undefined,
    { message: 'empty edit' },
  );

export const competitionEditSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    logo: logoSchema.optional(),
  })
  .refine((body) => body.name !== undefined || body.logo !== undefined, {
    message: 'empty edit',
  });

export interface WorldEditorDeps {
  world: WorldEditorRepository;
}

export async function getEditableWorld(
  deps: WorldEditorDeps,
  saveGameId: string,
): Promise<EditableWorld | null> {
  if (!saveGameId) return null;
  return deps.world.loadWorld(saveGameId);
}

export async function editClub(
  deps: WorldEditorDeps,
  input: { saveGameId: string; clubId: string } & z.infer<typeof clubEditSchema>,
): Promise<boolean> {
  // Guard: Prisma silently drops undefined where-fields, so an empty id
  // would otherwise turn this into a mass update.
  if (!input.saveGameId || !input.clubId) return false;
  return deps.world.updateClub({
    saveGameId: input.saveGameId,
    clubId: input.clubId,
    name: input.name,
    shortName: input.shortName?.toUpperCase(),
    logo: input.logo,
  });
}

export async function editCompetition(
  deps: WorldEditorDeps,
  input: {
    saveGameId: string;
    competitionId: string;
  } & z.infer<typeof competitionEditSchema>,
): Promise<boolean> {
  if (!input.saveGameId || !input.competitionId) return false;
  return deps.world.updateCompetition({
    saveGameId: input.saveGameId,
    competitionId: input.competitionId,
    name: input.name,
    logo: input.logo,
  });
}
