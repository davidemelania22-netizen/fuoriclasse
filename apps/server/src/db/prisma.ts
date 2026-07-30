import { PrismaClient } from '@prisma/client';

let singleton: PrismaClient | undefined;

/**
 * Returns a PrismaClient. With no argument, a lazily-created process singleton
 * is reused (production/dev). Passing an explicit `databaseUrl` returns a fresh
 * client bound to that database — used by tests against throwaway SQLite files.
 */
/**
 * SQLite locks the whole file for the duration of a write transaction. With
 * the default (no) busy timeout, a second process/connection touching the
 * same file (e.g. a stale server left running from a previous session) makes
 * writes fail immediately with "database is locked" instead of waiting for
 * the lock to clear. A generous busy timeout turns that into a short wait.
 */
function withBusyTimeout(client: PrismaClient): PrismaClient {
  void client.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
  return client;
}

export function getPrismaClient(databaseUrl?: string): PrismaClient {
  if (databaseUrl) {
    return withBusyTimeout(
      new PrismaClient({ datasources: { db: { url: databaseUrl } } }),
    );
  }
  singleton ??= withBusyTimeout(new PrismaClient());
  return singleton;
}
