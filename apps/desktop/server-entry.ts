/**
 * Bundle entry point for the packaged desktop app.
 *
 * `scripts/build-desktop.mjs` feeds this file to esbuild, which follows the
 * imports through the server and the engine packages and emits a single
 * `server.cjs` with no TypeScript, no workspace links and no npm install —
 * exactly what an installed app can run. The only dependency left outside the
 * bundle is `@prisma/client`, which loads a native engine and therefore ships
 * as real files (see `linkPrismaRuntime` in `main.mjs`).
 */
export { buildApp } from '../server/src/app';
