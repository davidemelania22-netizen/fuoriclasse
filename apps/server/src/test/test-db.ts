import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const here = dirname(fileURLToPath(import.meta.url));
// apps/server/src/test -> repo root
const repoRoot = join(here, '..', '..', '..', '..');
const schemaPath = join(repoRoot, 'prisma', 'schema.prisma');

export interface TestDatabase {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

/**
 * Provisions a throwaway SQLite database with the current Prisma schema and
 * returns a client bound to it. Each call is fully isolated.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const dir = mkdtempSync(join(tmpdir(), 'football-life-test-'));
  const dbPath = join(dir, 'test.db');
  const url = `file:${dbPath}`;

  execFileSync(
    'npx',
    [
      'prisma',
      'db',
      'push',
      '--schema',
      schemaPath,
      '--skip-generate',
      '--accept-data-loss',
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'ignore',
    },
  );

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
