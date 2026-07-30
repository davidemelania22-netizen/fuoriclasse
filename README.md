# Fuoriclasse: simulatore di carriera calcistica

Simulatore gestionale e narrativo della carriera di un calciatore (14 → 42
anni). Le partite non sono giocate direttamente: vengono simulate da un motore
deterministico e presentate in forma testuale (risultato, minuti, voto,
statistiche, cronaca, conseguenze).

> Stato attuale: **MVP completo (Milestone 1–10)**. Motore deterministico
> (generazione mondo, allenamento/crescita, partite, carriera/contratti,
> infortuni/benessere, eventi, ritiro), API Fastify e interfaccia React.

## Requisiti

- **Node.js >= 20** (consigliato via [nvm](https://github.com/nvm-sh/nvm))
- **npm >= 10** (incluso con Node)

```bash
nvm use        # usa la versione indicata in .nvmrc (20)
```

## Installazione

```bash
cd football-life
npm install
cp .env.example .env
```

## Distribuire il gioco (installer per Mac e Windows)

Il modo pensato per chi riceve il gioco: un file da scaricare, doppio clic,
installato. Niente Node, niente terminale, niente cartelle del progetto.

```bash
npm run desktop:package:mac    # .dmg (sul Mac su cui giri il comando)
npm run desktop:package:win    # installer .exe (da eseguire su Windows)
```

I file finiti compaiono in `apps/desktop/release/`. Ogni piattaforma va
costruita sulla propria macchina: il gioco include il motore nativo di Prisma,
che esiste in una versione diversa per ogni sistema operativo. Per questo
`.github/workflows/release.yml` costruisce le tre versioni (Mac Apple Silicon,
Mac Intel, Windows) e le pubblica in una **Release di GitHub**: quella pagina è
il link da dare a chi vuole giocare. Basta creare un tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Cosa fa `npm run desktop:stage` (il passaggio prima dell'impacchettamento,
in `scripts/build-desktop.mjs`): compila il client web, riduce il server a un
unico file JavaScript con esbuild, copia il client Prisma con il suo motore
nativo e prepara un database vuoto già seedato. L'app installata lo copia al
primo avvio nella cartella dati dell'utente — le carriere non stanno mai dentro
il pacchetto dell'applicazione, che è di sola lettura.

L'app **non è firmata** (serve un certificato Apple a pagamento): la prima
volta, su Mac, occorre **tasto destro sull'app → Apri → Apri**. Su Windows
SmartScreen mostra "Altre informazioni" → "Esegui comunque".

I salvataggi vivono in `~/Library/Application Support/Fuoriclasse/` su macOS
e in `%APPDATA%\Fuoriclasse\` su Windows, con backup automatici a ogni avvio.

## Giocare dalla cartella del progetto (senza installer)

Alternativa se si preferisce passare i sorgenti. Servono due cose: **Node.js 20
o superiore** (si scarica da [nodejs.org](https://nodejs.org), installazione
normale "avanti-avanti") e la cartella del gioco.

Poi:

| Sistema     | Cosa fare                                                         |
| ----------- | ----------------------------------------------------------------- |
| **macOS**   | doppio clic su `scripts/start-game.command`                       |
| **Windows** | doppio clic su `scripts/start-game.bat`                           |

Il primo avvio installa le dipendenze e prepara il database: ci vogliono
qualche minuto e serve la connessione a internet. Dalla volta successiva il
gioco parte in pochi secondi. Il browser si apre da solo su
`http://localhost:5173`; per fermare il gioco basta chiudere la finestra del
terminale.

**Su macOS**, la prima volta il sistema può rifiutarsi di aprire un file
scaricato da internet. In quel caso: **tasto destro** sul file →
**Apri** → **Apri** di nuovo nella finestra di conferma. Va fatto una volta
sola.

I salvataggi restano sul computer di chi gioca, in `prisma/dev.db`: ogni
installazione ha le sue carriere, separate da quelle di chiunque altro.

## Comandi

| Comando                    | Descrizione                                                |
| -------------------------- | ---------------------------------------------------------- |
| `npm run dev`              | Avvia server (Fastify) e web (Vite) in parallelo           |
| `npm run dev:server`       | Avvia solo il backend                                      |
| `npm run dev:web`          | Avvia solo il frontend                                     |
| `npm run build`            | Build dei workspace che la prevedono (web)                 |
| `npm run typecheck`        | Type-check TypeScript di tutti i workspace                 |
| `npm run lint`             | ESLint sull'intero monorepo                                |
| `npm run format`           | Prettier in scrittura                                      |
| `npm run format:check`     | Prettier in sola verifica                                  |
| `npm run test`             | Esegue i test (Vitest)                                     |
| `npm run test:statistical` | Esegue i test statistici (carriere, partite, infortuni)    |
| `npm run prisma:migrate`   | Crea/applica le migrazioni SQLite                          |
| `npm run prisma:seed`      | Popola i dati statici (paesi)                              |
| `npm run simulate:careers` | Simula N carriere complete e stampa le metriche            |
| `npm run editor`           | Editor esterno live (CLI) collegato al gioco in esecuzione |

Esempio del simulatore batch (200 carriere):

```bash
npm run simulate:careers 200
```

### Editor esterno (modifica in tempo reale)

Con il gioco avviato (`npm run dev`), in un altro terminale:

```bash
npm run editor
# (opzionale) puntare a un host diverso:
# EDITOR_API_URL=http://localhost:3001 npm run editor
```

Si seleziona un salvataggio e si usano comandi come `money 5000000`,
`set currentAbility 90`, `attr finishing 95`, `career ACTIVE`, `status`, `quit`.
Le modifiche passano dalla stessa API (con validazione/clamp) e sono applicate al
salvataggio in tempo reale.

Verifica rapida del backend dopo `npm run dev:server`:

```bash
curl http://localhost:3001/health
# {"status":"ok","service":"football-life-server"}
```

## Struttura del progetto

```
football-life/
├── apps/
│   ├── web/      # React + TypeScript + Vite (UI testuale/gestionale)
│   └── server/   # Node + TypeScript + Fastify (API HTTP)
├── packages/
│   ├── simulation-engine/  # motore deterministico, zero dipendenze da framework/DB
│   ├── shared/             # contratti, schemi e utility condivisi
│   └── game-data/          # contenuti calcistici fittizi (license-free)
├── tsconfig.base.json
├── eslint.config.js
└── package.json            # npm workspaces
```

## Architettura (sintesi)

```
Frontend → API HTTP → use cases → simulation engine → repository → Prisma/SQLite
```

Il package `simulation-engine` è indipendente dall'interfaccia: non importa
React/Fastify/Prisma, non legge `process.env`, non usa l'orologio di sistema e
non chiama `Math.random()`. Riceve dati in ingresso e restituisce nuovi stati ed
eventi, così da essere testabile in isolamento e deterministico a parità di seed.

## Variabili d'ambiente

Vedi `.env.example`. Per l'MVP non sono presenti segreti.

| Variabile                 | Default         | Uso                                |
| ------------------------- | --------------- | ---------------------------------- |
| `DATABASE_URL`            | `file:./dev.db` | SQLite (da Milestone 2)            |
| `PORT`                    | `3001`          | Porta del backend                  |
| `HOST`                    | `0.0.0.0`       | Host del backend                   |
| `LOG_LEVEL`               | `info`          | Livello di log                     |
| `SIMULATION_DEFAULT_SEED` | `football-life` | Seed predefinito delle simulazioni |
| `NODE_ENV`                | `development`   | Ambiente                           |

## Roadmap

Tutte e 10 le milestone dell'MVP sono completate: inizializzazione, dominio +
database, generazione mondo, tempo/allenamento, motore partita, carriera/
contratti, infortuni/relazioni, eventi dinamici, API + interfaccia, ritiro +
bilanciamento. Il motore è deterministico e validato da test statistici
(`npm run test:statistical`, `npm run simulate:careers`).
