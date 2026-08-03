import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { resolveDbFile } from '../db/backup';
import { takeSnapshot } from '../db/snapshots';

/**
 * Settings that the server has to act on, kept in a JSON file next to the
 * database — no schema change, and it survives the app being reinstalled over
 * the same data folder.
 *
 * Everything purely cosmetic (text size, currency, whether the scenes play)
 * lives in the browser instead: it is per-device and needs no round trip.
 */

export const settingsSchema = z.object({
  /**
   * Off until the player says otherwise. Snapshotting the whole world costs
   * real disk, and a career that is already written to disk continuously does
   * not need saving — so this is a choice, never a default.
   */
  autoSaveEnabled: z.boolean(),
  /** Game weeks between automatic snapshots. */
  autoSaveEveryWeeks: z.union([
    z.literal(1),
    z.literal(4),
    z.literal(12),
    z.literal(38),
  ]),
  /** How many automatic snapshots to keep before rotating the oldest away. */
  autoSaveKeep: z.number().int().min(1).max(20),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  autoSaveEnabled: false,
  autoSaveEveryWeeks: 4,
  autoSaveKeep: 5,
};

/** Weeks-between-snapshots in words, for the dropdown. */
export const AUTOSAVE_INTERVALS = [
  { weeks: 1, label: 'Ogni settimana' },
  { weeks: 4, label: 'Ogni mese' },
  { weeks: 12, label: 'Ogni tre mesi' },
  { weeks: 38, label: 'Ogni stagione' },
] as const;

function settingsFile(): string | null {
  const db = resolveDbFile();
  return db ? path.join(path.dirname(db), 'impostazioni.json') : null;
}

export function readSettings(): Settings {
  const file = settingsFile();
  if (!file || !fs.existsSync(file)) return DEFAULT_SETTINGS;
  try {
    const parsed = settingsSchema.safeParse(
      JSON.parse(fs.readFileSync(file, 'utf8')),
    );
    // A file written by an older build simply falls back to the defaults
    // rather than taking the app down on boot.
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Settings): Settings {
  const file = settingsFile();
  if (file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf8');
  }
  return settings;
}

/** Weeks elapsed since the last automatic snapshot, tracked alongside it. */
function counterFile(): string | null {
  const db = resolveDbFile();
  return db ? path.join(path.dirname(db), '.autosave-weeks') : null;
}

function readCounter(): number {
  const file = counterFile();
  if (!file || !fs.existsSync(file)) return 0;
  const value = Number.parseInt(fs.readFileSync(file, 'utf8').trim(), 10);
  return Number.isFinite(value) ? value : 0;
}

function writeCounter(value: number): void {
  const file = counterFile();
  if (file) fs.writeFileSync(file, String(value), 'utf8');
}

/**
 * Called after weeks have been played. Takes a snapshot only when the player
 * turned autosave on and enough weeks have gone by; returns what it did so the
 * client can say so.
 */
export async function autoSaveAfterWeeks(
  weeksPlayed: number,
): Promise<{ saved: boolean; snapshotName: string | null }> {
  const settings = readSettings();
  if (!settings.autoSaveEnabled || weeksPlayed <= 0) {
    return { saved: false, snapshotName: null };
  }

  const pending = readCounter() + weeksPlayed;
  if (pending < settings.autoSaveEveryWeeks) {
    writeCounter(pending);
    return { saved: false, snapshotName: null };
  }

  const snapshot = await takeSnapshot(true, settings.autoSaveKeep);
  // Whole seasons can be skipped in one go: reset rather than subtract, so a
  // 38-week jump makes one snapshot and not thirty-eight.
  writeCounter(0);
  return { saved: snapshot !== null, snapshotName: snapshot?.name ?? null };
}
