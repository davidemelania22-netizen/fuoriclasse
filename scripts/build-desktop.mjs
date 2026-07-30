#!/usr/bin/env node
/**
 * Turns the monorepo into something a player can install.
 *
 * The repo runs on npm workspaces, TypeScript sources loaded through tsx and a
 * database created by the Prisma CLI. None of that exists on the machine of
 * someone who just downloaded a game, so this script stages a self-contained
 * copy under `apps/desktop/build/`:
 *
 *   build/app/         → the Electron application (main.mjs, server.cjs, web/)
 *   build/resources/   → files that must stay readable as real files:
 *                        the Prisma client with its native engine, and the
 *                        seeded database template copied out on first launch.
 *
 * `electron-builder` then wraps `build/app` into a .app/.exe and drops
 * `build/resources` next to it. Run it with `npm run desktop:package`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'apps/desktop/build');
const APP = path.join(BUILD, 'app');
const RESOURCES = path.join(BUILD, 'resources');

const step = (message) => console.log(`\n▶  ${message}`);
// On Windows `npm` and `npx` are batch files, and since the argument-injection
// fix in Node 20.12 spawning a .cmd without a shell fails outright with
// EINVAL. Going through the shell there is the supported way; on macOS and
// Linux we keep the direct, quoting-free exec.
const run = (command, args, env) =>
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });

/** Copy a tree, keeping only what `keep(relativePath, isDirectory)` accepts. */
function copyTree(from, to, keep = () => true) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const relative = path.relative(from, source);
    if (!keep(relative, entry.isDirectory())) continue;
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(source, target, (child, isDir) =>
      keep(path.join(relative, child), isDir),
    );
    else fs.copyFileSync(source, target);
  }
}

const bytes = (dir) => {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? bytes(full) : fs.statSync(full).size;
  }
  return total;
};
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// ---------------------------------------------------------------------------

step('Pulizia della cartella di build');
fs.rmSync(BUILD, { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });
fs.mkdirSync(RESOURCES, { recursive: true });

step('Build del client web (Vite)');
run('npm', ['run', 'build', '-w', '@football-life/web']);

step('Generazione del client Prisma per questa piattaforma');
run('npx', ['prisma', 'generate']);

step('Bundle del server in un unico file JavaScript');
await esbuild({
  entryPoints: [path.join(ROOT, 'apps/desktop/server-entry.ts')],
  outfile: path.join(APP, 'server.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // The only module left outside the bundle: it loads a native query engine,
  // so it has to exist as real files on disk (staged below).
  external: ['@prisma/client'],
  // Readable stack traces matter more than a few hundred kilobytes when the
  // only debugging channel is a player describing what went wrong.
  minify: false,
  logLevel: 'info',
});

step('Copia del client web e del processo principale');
copyTree(path.join(ROOT, 'apps/web/dist'), path.join(APP, 'web'));
fs.copyFileSync(path.join(ROOT, 'apps/desktop/main.mjs'), path.join(APP, 'main.mjs'));

const { version } = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
);
fs.writeFileSync(
  path.join(APP, 'package.json'),
  `${JSON.stringify(
    {
      name: 'fuoriclasse',
      productName: 'Fuoriclasse',
      version,
      description:
        'Fuoriclasse — gioco di esclusiva proprietà di Davide Simonetti.',
      author: 'Davide Simonetti',
      main: 'main.mjs',
      type: 'module',
      private: true,
    },
    null,
    2,
  )}\n`,
);

step('Copia del client Prisma e del motore nativo');
// Everything Prisma ships for other databases, other platforms, edge runtimes,
// source maps and TypeScript types is dead weight in an installer: the pruning
// below takes the vendored copy from ~95 MB to roughly 20 MB.
const DROP = /(\.map$|\.d\.ts$|\.d\.mts$|wasm|edge|react-native|binary|query_compiler)/;
const vendor = path.join(RESOURCES, 'prisma-runtime/node_modules');
copyTree(
  path.join(ROOT, 'node_modules/@prisma/client'),
  path.join(vendor, '@prisma/client'),
  (relative, isDirectory) => {
    if (isDirectory) return relative !== 'generator-build' && relative !== 'scripts';
    return !DROP.test(relative);
  },
);
copyTree(
  path.join(ROOT, 'node_modules/.prisma/client'),
  path.join(vendor, '.prisma/client'),
  // …but never drop the native engine, whatever the platform calls it.
  (relative) => relative.endsWith('.node') || !DROP.test(relative),
);

const engines = fs
  .readdirSync(path.join(vendor, '.prisma/client'))
  .filter((name) => name.endsWith('.node'));
if (engines.length === 0) {
  throw new Error(
    'Nessun motore Prisma nativo trovato: `prisma generate` non ha prodotto un engine per questa piattaforma.',
  );
}
console.log(`   motore: ${engines.join(', ')}`);

step('Creazione del database di partenza (vuoto, con i dati statici)');
// Built in a temp folder and copied in: `prisma db push` would otherwise be
// one typo away from touching the developer's own saves.
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'football-life-template-'));
const templateDb = path.join(scratch, 'template.db');
const templateEnv = { DATABASE_URL: `file:${templateDb}` };
run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], templateEnv);
run('npx', ['tsx', 'prisma/seed.ts'], templateEnv);
// A leftover write-ahead log would leave the copied template missing rows.
for (const suffix of ['-wal', '-shm']) {
  if (fs.existsSync(templateDb + suffix)) {
    throw new Error(
      `Il database template ha un journal ${suffix} non consolidato: la copia sarebbe incompleta.`,
    );
  }
}
fs.copyFileSync(templateDb, path.join(RESOURCES, 'template.db'));
fs.rmSync(scratch, { recursive: true, force: true });

console.log(
  `\n✅  Pronto in apps/desktop/build — app ${mb(bytes(APP))}, risorse ${mb(bytes(RESOURCES))}`,
);
