import { PrismaClient } from '@prisma/client';

let singleton: PrismaClient | undefined;

/**
 * Returns a PrismaClient. With no argument, a lazily-created process singleton
 * is reused (production/dev). Passing an explicit `databaseUrl` returns a fresh
 * client bound to that database — used by tests against throwaway SQLite files.
 */
export function getPrismaClient(databaseUrl?: string): PrismaClient {
  if (databaseUrl) {
    return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  }
  singleton ??= new PrismaClient();
  return singleton;
}
