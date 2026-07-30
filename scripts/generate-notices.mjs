#!/usr/bin/env node
/**
 * Writes THIRD-PARTY-NOTICES.md, the attribution file that has to travel with
 * every copy of the game.
 *
 * MIT, BSD and Apache all say the same thing: you may ship our code, but the
 * licence text and the copyright line must come along. So this walks the
 * dependency graph the *installed game* actually contains — not the hundreds
 * of build-time packages, which never leave this machine — and copies each
 * package's own licence file verbatim.
 *
 * Regenerate after changing dependencies: `npm run notices`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Where the shipped code comes from. Everything reachable from these
 * packages' runtime dependencies ends up either bundled into `server.cjs`,
 * bundled into the web assets, or copied in as real files.
 */
const SHIPPED_WORKSPACES = [
  'apps/server',
  'apps/web',
  'packages/shared',
  'packages/game-data',
  'packages/simulation-engine',
];

/**
 * Electron is declared as a build-time dependency because that is how it is
 * installed, but its runtime — Chromium, Node.js, V8 — is the largest single
 * body of third-party code in the installer. Attributing it is not optional.
 */
const EXTRA = ['electron'];

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Resolve a package by walking up node_modules the way Node itself does. */
function findPackage(name, from) {
  let dir = from;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const collected = new Map();

function collect(name, from) {
  const dir = findPackage(name, from);
  if (!dir) return;
  const manifest = readJson(path.join(dir, 'package.json'));
  const key = `${manifest.name}@${manifest.version}`;
  if (collected.has(key)) return;
  collected.set(key, { dir, manifest });
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    collect(dependency, dir);
  }
}

for (const workspace of SHIPPED_WORKSPACES) {
  const manifest = readJson(path.join(ROOT, workspace, 'package.json'));
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    // Workspace siblings are our own code, not third-party.
    if (dependency.startsWith('@football-life/')) continue;
    collect(dependency, path.join(ROOT, workspace));
  }
}
for (const name of EXTRA) collect(name, ROOT);

const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'license',
  'LICENSE-MIT',
  'LICENSE.BSD',
];

function licenseText(dir) {
  for (const name of LICENSE_FILES) {
    const file = path.join(dir, name);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return fs.readFileSync(file, 'utf8').trim();
    }
  }
  return null;
}

const licenseId = (manifest) =>
  typeof manifest.license === 'string'
    ? manifest.license
    : (manifest.license?.type ?? manifest.licenses?.[0]?.type ?? 'sconosciuta');

const entries = [...collected.values()].sort((a, b) =>
  a.manifest.name.localeCompare(b.manifest.name),
);

const byLicense = new Map();
for (const { manifest } of entries) {
  const id = licenseId(manifest);
  byLicense.set(id, (byLicense.get(id) ?? 0) + 1);
}

const missing = [];
const lines = [
  '# Note sui componenti di terze parti',
  '',
  'Fuoriclasse include i componenti software elencati qui sotto, distribuiti',
  'dai rispettivi autori sotto le licenze indicate. Quelle licenze si',
  'applicano a quei componenti; il gioco resta di esclusiva proprietà di',
  'Davide Simonetti (vedi `LICENSE`).',
  '',
  `Generato automaticamente da \`scripts/generate-notices.mjs\` — ${entries.length} componenti.`,
  '',
  '## Riepilogo',
  '',
  '| Licenza | Componenti |',
  '| ------- | ---------- |',
  ...[...byLicense.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `| ${id} | ${count} |`),
  '',
  '## Testi delle licenze',
  '',
];

for (const { dir, manifest } of entries) {
  const text = licenseText(dir);
  if (!text) missing.push(`${manifest.name}@${manifest.version}`);
  lines.push(
    `### ${manifest.name} ${manifest.version}`,
    '',
    `Licenza: **${licenseId(manifest)}**${
      manifest.homepage ? ` — ${manifest.homepage}` : ''
    }`,
    '',
    '```',
    text ??
      `Nessun file di licenza incluso nel pacchetto. Licenza dichiarata: ${licenseId(manifest)}.`,
    '```',
    '',
  );
}

const out = path.join(ROOT, 'THIRD-PARTY-NOTICES.md');
fs.writeFileSync(out, `${lines.join('\n')}\n`);

console.log(`✅  THIRD-PARTY-NOTICES.md — ${entries.length} componenti`);
for (const [id, count] of [...byLicense.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(count).padStart(4)} × ${id}`);
}
if (missing.length > 0) {
  console.log(
    `\n⚠️  ${missing.length} pacchetti senza file di licenza (riportata solo quella dichiarata):`,
  );
  console.log(`    ${missing.join(', ')}`);
}
