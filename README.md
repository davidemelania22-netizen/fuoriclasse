# Football Life: Player Career Simulator

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

## Comandi

| Comando                    | Descrizione                                             |
| -------------------------- | ------------------------------------------------------- |
| `npm run dev`              | Avvia server (Fastify) e web (Vite) in parallelo        |
| `npm run dev:server`       | Avvia solo il backend                                   |
| `npm run dev:web`          | Avvia solo il frontend                                  |
| `npm run build`            | Build dei workspace che la prevedono (web)              |
| `npm run typecheck`        | Type-check TypeScript di tutti i workspace              |
| `npm run lint`             | ESLint sull'intero monorepo                             |
| `npm run format`           | Prettier in scrittura                                   |
| `npm run format:check`     | Prettier in sola verifica                               |
| `npm run test`             | Esegue i test (Vitest)                                  |
| `npm run test:statistical` | Esegue i test statistici (carriere, partite, infortuni) |
| `npm run prisma:migrate`   | Crea/applica le migrazioni SQLite                       |
| `npm run prisma:seed`      | Popola i dati statici (paesi)                           |
| `npm run simulate:careers` | Simula N carriere complete e stampa le metriche         |

Esempio del simulatore batch (200 carriere):

```bash
npm run simulate:careers 200
```

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
