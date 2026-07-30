import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type { PrismaClient } from '@prisma/client';
import type { WorldGenerationConfig } from '@football-life/shared';
import { getPrismaClient } from './db/prisma';
import { backupDatabaseOnce } from './db/backup';
import { registerApiRoutes } from './routes/api';

export interface BuildAppOptions {
  logger?: boolean;
  prisma?: PrismaClient;
  /** World size generated for new careers. Tests inject a tiny world. */
  worldConfig?: WorldGenerationConfig;
  /**
   * Absolute path to a built `apps/web` (`vite build` output). When set, the
   * server also serves the web app's static assets from `/` — used to run
   * the whole game from a single process/port (e.g. the desktop app), with
   * no separate Vite dev server. The web app has no client-side router, so a
   * single `index.html` at `/` is enough — no SPA fallback needed.
   */
  staticDir?: string;
  /**
   * Snapshot the SQLite file into `prisma/backups/` at boot, BEFORE the
   * deleted-save purge may touch it. On for the real dev/desktop servers,
   * off for tests (their throwaway databases don't need insurance).
   */
  backupDb?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });
  const prisma = options.prisma ?? getPrismaClient();

  // Fastify's default JSON parser rejects an EMPTY body when the
  // Content-Type header is set (FST_ERR_CTP_EMPTY_JSON_BODY) — but clients
  // (notably the pre-2026-07-06 web bundle shipped inside the desktop app)
  // send `Content-Type: application/json` even on bodyless DELETE/POST.
  // Treat an empty JSON body as "no body" so those requests keep working.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_request, body, done) => {
      if (body === '' || body === undefined) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(body as string));
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );

  app.get('/health', async () => {
    return { status: 'ok', service: 'football-life-server' };
  });

  // The purge must never run before the boot backup has finished.
  const bootGate: Promise<unknown> = options.backupDb
    ? backupDatabaseOnce().catch((error) => {
        app.log.error(error, 'Database backup failed');
        return null;
      })
    : Promise.resolve(null);

  registerApiRoutes(app, prisma, options.worldConfig, bootGate);

  if (options.staticDir) {
    void app.register(fastifyStatic, { root: options.staticDir });
  }

  return app;
}
