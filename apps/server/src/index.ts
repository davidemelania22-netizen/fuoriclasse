import { buildApp } from './app';

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const host = process.env.HOST ?? '0.0.0.0';

const app = buildApp({ logger: true, backupDb: true });

try {
  const address = await app.listen({ port, host });
  app.log.info(`Fuoriclasse server listening on ${address}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
