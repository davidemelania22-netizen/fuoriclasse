import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { app, dialog, BrowserWindow, Menu, shell } from 'electron';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * The desktop app runs in two very different shapes:
 *
 *  - DEVELOPMENT (`npm run desktop:dev`): this file sits in `apps/desktop/` of
 *    the repo. The server is loaded straight from its TypeScript sources via
 *    tsx, and the database is the developer's own `prisma/dev.db` — so the
 *    saves you see here are the same ones `npm run dev` uses.
 *
 *  - PACKAGED (the .app / .exe a player installs): this file sits in the app
 *    bundle next to a pre-built `server.cjs` and `web/`. There is no repo, no
 *    npm, no TypeScript. The database lives in the OS user-data folder, and
 *    is created on first launch from a seeded template shipped inside the app.
 *
 * Everything below branches on `app.isPackaged` and on nothing else.
 */
const packaged = app.isPackaged;
const REPO_ROOT = packaged ? null : path.resolve(HERE, '..', '..');

/** Where the player's careers live. Never inside the app bundle: that is read-only. */
function resolveDatabaseFile() {
  if (!packaged) return path.join(REPO_ROOT, 'prisma', 'dev.db');
  return path.join(app.getPath('userData'), 'football-life.db');
}

/**
 * First launch has no database. Rather than shipping the Prisma CLI (hundreds
 * of megabytes, and it would need npm) the packaging step bakes an empty,
 * already-seeded SQLite file into the bundle; here we just copy it out.
 */
function ensureDatabase(dbFile) {
  // In development the database is the repo's own `prisma/dev.db`, created by
  // the usual Prisma commands — there is no template to fall back on.
  if (!packaged || fs.existsSync(dbFile)) return;
  const template = path.join(process.resourcesPath, 'template.db');
  if (!fs.existsSync(template)) {
    throw new Error(`Database template missing from the app bundle: ${template}`);
  }
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.copyFileSync(template, dbFile);
}

/**
 * The Prisma client cannot be bundled: it loads a platform-specific native
 * engine at runtime. It ships unpacked under `Resources/prisma-runtime/` and
 * `server.cjs` asks for it by its bare name, so point that one specifier at
 * the copy we shipped.
 */
function linkPrismaRuntime() {
  const root = path.join(process.resourcesPath, 'prisma-runtime', 'node_modules');
  const entry = require.resolve(path.join(root, '@prisma', 'client'));
  const Module = require('node:module');
  const resolveFilename = Module._resolveFilename;
  Module._resolveFilename = function patched(request, ...rest) {
    if (request === '@prisma/client') return entry;
    return resolveFilename.call(this, request, ...rest);
  };
}

async function loadBuildApp() {
  if (packaged) {
    linkPrismaRuntime();
    return require(path.join(HERE, 'server.cjs')).buildApp;
  }
  // tsx's own register() (not node:module's) is required: Electron's Node
  // build routes node:module's register() through the deprecated --loader path.
  const { register } = await import(
    path.join(REPO_ROOT, 'node_modules/tsx/dist/esm/api/index.mjs')
  );
  register();
  const { buildApp } = await import(path.join(REPO_ROOT, 'apps/server/src/app.ts'));
  return buildApp;
}

async function startServer() {
  const dbFile = resolveDatabaseFile();
  ensureDatabase(dbFile);
  process.env.DATABASE_URL ??= `file:${dbFile}`;

  const buildApp = await loadBuildApp();
  const fastify = buildApp({
    logger: false,
    staticDir: packaged
      ? path.join(HERE, 'web')
      : path.join(REPO_ROOT, 'apps/web/dist'),
    backupDb: true,
  });
  await fastify.listen({ port: 0, host: '127.0.0.1' });
  return fastify.server.address().port;
}

function buildMenu() {
  const template = [
    { role: 'appMenu' },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  const port = await startServer();
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Football Life',
    backgroundColor: '#0a0d13',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });
  // Anything that is not the game itself (an external link) belongs in the
  // player's browser, not in a chrome-less Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  await win.loadURL(`http://127.0.0.1:${port}/`);
}

/**
 * A player has no terminal and no devtools. If the boot fails they must still
 * be told what happened, and where the log is.
 */
function reportFatal(error) {
  const logFile = path.join(app.getPath('userData'), 'errore-avvio.txt');
  const detail = error?.stack ?? String(error);
  try {
    fs.writeFileSync(logFile, `${new Date().toISOString()}\n\n${detail}\n`);
  } catch {
    // Nothing else we can do; the dialog below still carries the message.
  }
  dialog.showErrorBox(
    'Football Life non è riuscito ad avviarsi',
    `${detail}\n\nDettagli salvati in:\n${logFile}`,
  );
  app.quit();
}

app.whenReady().then(async () => {
  buildMenu();
  try {
    await createWindow();
  } catch (error) {
    reportFatal(error);
    return;
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
