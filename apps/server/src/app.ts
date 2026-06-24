import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './db/prisma';
import { registerApiRoutes } from './routes/api';

export interface BuildAppOptions {
  logger?: boolean;
  prisma?: PrismaClient;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });
  const prisma = options.prisma ?? getPrismaClient();

  app.get('/health', async () => {
    return { status: 'ok', service: 'football-life-server' };
  });

  registerApiRoutes(app, prisma);

  return app;
}
