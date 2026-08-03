import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  autoSaveAfterWeeks,
  readSettings,
  writeSettings,
} from './settings';
import { listSnapshots, restoreSnapshot, takeSnapshot } from '../db/snapshots';

/**
 * These touch the filesystem on purpose: the whole feature is "copy the
 * database aside", and a mocked fs would test nothing worth testing. Each run
 * gets its own temporary directory pointed at by DATABASE_URL.
 */

let dir: string;
let previousUrl: string | undefined;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fuoriclasse-settings-'));
  const db = path.join(dir, 'dev.db');
  // A file that is not really SQLite is fine: nothing here opens it.
  fs.writeFileSync(db, 'database');
  previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${db}`;
});

afterEach(() => {
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('settings', () => {
  it('starts with automatic saves switched off', () => {
    expect(DEFAULT_SETTINGS.autoSaveEnabled).toBe(false);
    expect(readSettings().autoSaveEnabled).toBe(false);
  });

  it('remembers what the player chose', () => {
    writeSettings({
      autoSaveEnabled: true,
      autoSaveEveryWeeks: 12,
      autoSaveKeep: 3,
    });
    expect(readSettings()).toEqual({
      autoSaveEnabled: true,
      autoSaveEveryWeeks: 12,
      autoSaveKeep: 3,
    });
  });

  it('falls back to the defaults on a corrupt file', () => {
    fs.writeFileSync(path.join(dir, 'impostazioni.json'), '{ not json');
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saves nothing while the player leaves autosave off', async () => {
    const result = await autoSaveAfterWeeks(52);
    expect(result.saved).toBe(false);
    expect(await listSnapshots()).toEqual([]);
  });

  it('saves only once the interval has actually elapsed', async () => {
    writeSettings({
      autoSaveEnabled: true,
      autoSaveEveryWeeks: 4,
      autoSaveKeep: 5,
    });

    expect((await autoSaveAfterWeeks(1)).saved).toBe(false);
    expect((await autoSaveAfterWeeks(2)).saved).toBe(false);
    expect((await autoSaveAfterWeeks(1)).saved).toBe(true);
    expect((await listSnapshots()).length).toBe(1);

    // The counter resets, so the next copy is another four weeks away.
    expect((await autoSaveAfterWeeks(1)).saved).toBe(false);
  });

  it('makes one copy for a whole season skipped in one go', async () => {
    writeSettings({
      autoSaveEnabled: true,
      autoSaveEveryWeeks: 4,
      autoSaveKeep: 5,
    });
    expect((await autoSaveAfterWeeks(38)).saved).toBe(true);
    expect((await listSnapshots()).length).toBe(1);
  });

  it('rotates automatic copies but never the manual ones', async () => {
    for (let i = 0; i < 3; i += 1) {
      await takeSnapshot(true, 2);
      // Names carry a second-resolution timestamp; step past it.
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    await takeSnapshot(false, 2);

    const snapshots = await listSnapshots();
    expect(snapshots.filter((s) => s.automatic).length).toBe(2);
    expect(snapshots.filter((s) => !s.automatic).length).toBe(1);
  });

  it('puts the database back and keeps the replaced one aside', async () => {
    const db = path.join(dir, 'dev.db');
    const first = await takeSnapshot(false, 5);
    expect(first).not.toBeNull();

    fs.writeFileSync(db, 'rovinato');
    expect(await restoreSnapshot(first!.name)).toBe(true);
    expect(fs.readFileSync(db, 'utf8')).toBe('database');

    // The ruined state was copied aside before being overwritten.
    const after = await listSnapshots();
    expect(after.length).toBe(2);
  });

  it('refuses a snapshot name that tries to leave the folder', async () => {
    expect(await restoreSnapshot('../../etc/passwd')).toBe(false);
    expect(await restoreSnapshot('..%2Fdev.db')).toBe(false);
  });
});
