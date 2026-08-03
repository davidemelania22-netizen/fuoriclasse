import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDbFile } from './backup';

const execFileAsync = promisify(execFile);

/**
 * Player-facing save points, as opposed to the boot backups in `backup.ts`.
 *
 * The career is written to SQLite the moment anything happens, so nothing is
 * ever *lost*; what a snapshot buys is the ability to go back — to undo a
 * transfer, a gamble, a season. That is why this is off until the player turns
 * it on: taking a copy of the whole world every week is their call, not ours.
 */

export interface Snapshot {
  /** File name, and the id used to restore it. */
  name: string;
  createdAt: string;
  sizeBytes: number;
  /** True for the copy taken automatically, false for "Salva adesso". */
  automatic: boolean;
}

function snapshotDir(db: string): string {
  return path.join(path.dirname(db), 'snapshots');
}

const PREFIX = { auto: 'auto-', manual: 'manuale-' } as const;

export async function listSnapshots(): Promise<Snapshot[]> {
  const db = resolveDbFile();
  if (!db) return [];
  const dir = snapshotDir(db);
  if (!fs.existsSync(dir)) return [];

  const files = await fs.promises.readdir(dir);
  const rows: Snapshot[] = [];
  for (const name of files) {
    if (!name.endsWith('.db')) continue;
    const stat = await fs.promises.stat(path.join(dir, name));
    rows.push({
      name,
      createdAt: stat.mtime.toISOString(),
      sizeBytes: stat.size,
      automatic: name.startsWith(PREFIX.auto),
    });
  }
  // Newest first: the one you want back is almost always the last one.
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Copy the live database aside. Returns the snapshot, or null without a db. */
export async function takeSnapshot(
  automatic: boolean,
  keep: number,
): Promise<Snapshot | null> {
  const db = resolveDbFile();
  if (!db) return null;
  const dir = snapshotDir(db);
  await fs.promises.mkdir(dir, { recursive: true });

  // Two copies inside the same second must not collide. Restoring takes a
  // copy of the live database first, and when that landed on the name of the
  // snapshot being restored it overwrote it — then put the overwritten file
  // back, losing exactly the state the player asked for.
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const prefix = automatic ? PREFIX.auto : PREFIX.manual;
  let name = `${prefix}${stamp}.db`;
  for (let n = 2; fs.existsSync(path.join(dir, name)); n += 1) {
    name = `${prefix}${stamp}-${n}.db`;
  }
  const dest = path.join(dir, name);

  try {
    // The online-backup API copies a consistent database even mid-write.
    await execFileAsync('sqlite3', [db, `.backup '${dest}'`]);
  } catch {
    await fs.promises.copyFile(db, dest);
  }

  await prune(dir, keep);
  const stat = await fs.promises.stat(dest);
  return {
    name,
    createdAt: stat.mtime.toISOString(),
    sizeBytes: stat.size,
    automatic,
  };
}

/** Keep the newest `keep` automatic copies; manual ones are never rotated. */
async function prune(dir: string, keep: number): Promise<void> {
  const files = (await fs.promises.readdir(dir))
    .filter((f) => f.startsWith(PREFIX.auto) && f.endsWith('.db'))
    .sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) {
    for (const suffix of ['', '-wal', '-shm']) {
      await fs.promises.rm(path.join(dir, `${old}${suffix}`), { force: true });
    }
  }
}

export async function deleteSnapshot(name: string): Promise<boolean> {
  const db = resolveDbFile();
  if (!db || !isSafeName(name)) return false;
  const target = path.join(snapshotDir(db), name);
  if (!fs.existsSync(target)) return false;
  for (const suffix of ['', '-wal', '-shm']) {
    await fs.promises.rm(`${target}${suffix}`, { force: true });
  }
  return true;
}

/**
 * Put a snapshot back. The database currently in place is copied aside first
 * under a `manuale-` name, so restoring the wrong one is itself undoable.
 *
 * The caller must close Prisma's connection and reopen it: SQLite hands out
 * file handles, and swapping the file under a live pool reads the old pages.
 */
export async function restoreSnapshot(name: string): Promise<boolean> {
  const db = resolveDbFile();
  if (!db || !isSafeName(name)) return false;
  const source = path.join(snapshotDir(db), name);
  if (!fs.existsSync(source)) return false;

  await takeSnapshot(false, Number.MAX_SAFE_INTEGER);

  // Drop the journal files: they belong to the database being replaced, and
  // leaving them behind lets SQLite replay them over the restored pages.
  for (const suffix of ['-wal', '-shm']) {
    await fs.promises.rm(`${db}${suffix}`, { force: true });
  }
  await fs.promises.copyFile(source, db);
  return true;
}

/** Snapshot names come from the client: never let one walk out of the folder. */
function isSafeName(name: string): boolean {
  return /^[A-Za-z0-9._-]+\.db$/.test(name) && !name.includes('..');
}
