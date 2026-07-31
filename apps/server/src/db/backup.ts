import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);

/** Locate the SQLite file behind DATABASE_URL (or the dev convention). */
export function resolveDbFile(): string | null {
  const url = process.env.DATABASE_URL ?? '';
  if (url.startsWith('file:')) {
    const p = url.slice('file:'.length);
    if (path.isAbsolute(p) && fs.existsSync(p)) return p;
  }
  // Dev convention: <repo root>/prisma/dev.db, walking up from cwd.
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, 'prisma', 'dev.db');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Disaster insurance: snapshot the database into `prisma/backups/` once per
 * boot, keeping the most recent `keep` copies. Runs BEFORE the deleted-save
 * purge so there is always a pre-purge copy to roll back to — a lesson paid
 * for in blood on 2026-07-14, when every save was purged and no backup or
 * OS snapshot existed to restore from.
 *
 * `keep` must be generous: on 2026-07-15 a schema push wiped the database
 * and the only two retained snapshots were both taken by boots AFTER the
 * wipe, rotating the good ones away. Eight boots of headroom prevents that.
 */
export async function backupDatabaseOnce(keep = 8): Promise<string | null> {
  const db = resolveDbFile();
  if (!db) return null;
  const dir = path.join(path.dirname(db), 'backups');
  await fs.promises.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const dest = path.join(dir, `dev-${stamp}.db`);

  if (!fs.existsSync(dest)) {
    try {
      // sqlite's online-backup API produces a consistent snapshot even if a
      // writer shows up mid-copy.
      await execFileAsync('sqlite3', [db, `.backup '${dest}'`]);
    } catch {
      // No sqlite3 CLI: a plain copy is still infinitely better than nothing.
      await fs.promises.copyFile(db, dest);
      const wal = `${db}-wal`;
      if (fs.existsSync(wal)) {
        await fs.promises.copyFile(wal, `${dest}-wal`).catch(() => undefined);
      }
    }
  }

  const files = (await fs.promises.readdir(dir))
    .filter((f) => f.startsWith('dev-') && f.endsWith('.db'))
    .sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) {
    // `-shm` as well as `-wal`: rotating only two of SQLite's three files left
    // orphaned shared-memory files behind on every boot, for backups whose
    // database had long since been deleted.
    for (const suffix of ['', '-wal', '-shm']) {
      await fs.promises.rm(path.join(dir, `${old}${suffix}`), { force: true });
    }
  }
  return dest;
}
