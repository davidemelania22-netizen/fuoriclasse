# Fuoriclasse: simulatore di carriera calcistica

Simulatore gestionale e narrativo della carriera di un calciatore (14 → 42
anni). Le partite non sono giocate direttamente: vengono simulate da un motore
deterministico e presentate in forma testuale (risultato, minuti, voto,
statistiche, cronaca, conseguenze).

> Stato attuale: **MVP completo (Milestone 1–10)**. Motore deterministico
> (generazione mondo, allenamento/crescita, partite, carriera/contratti,
> infortuni/benessere, eventi, ritiro), API Fastify e interfaccia React.

## Scaricare e giocare

Versione attuale: **0.1.9**.

Non serve né Node né il terminale: si scarica un file, doppio clic, installato.

**[github.com/davidemelania22-netizen/fuoriclasse/releases/latest](https://github.com/davidemelania22-netizen/fuoriclasse/releases/latest)**

| File                          | Per chi                          |
| ----------------------------- | -------------------------------- |
| `Fuoriclasse-0.1.9-arm64.dmg` | Mac con chip Apple (M1/M2/M3/M4) |
| `Fuoriclasse.Setup.0.1.9.exe` | Windows                          |

L'app **non è firmata** (servirebbe un certificato Apple a pagamento), quindi la
prima volta il sistema avvisa. È normale, e va fatto una volta sola:

- **macOS** — tasto destro sull'app → **Apri** → **Apri** di nuovo. Con il
  doppio clic normale macOS risponde "Impossibile verificare lo sviluppatore".
- **Windows** — allo schermo blu di SmartScreen: **Ulteriori informazioni** →
  **Esegui comunque**.

Tutto gira in locale: le carriere restano sul computer di chi gioca e non
passano da nessun server.

### Novità della 0.1.9

- **Mercato** 🔁 — una pagina sua. Le **finestre** (estiva e invernale) dicono
  se è aperto e quanto manca: a mercato chiuso non si firma, e i club
  interessati aspettano invece di perdere interesse.
- Ogni offerta è **confrontata con il contratto che hai**: ingaggio, ruolo e
  reputazione del club, in verde o in rosso.
- **Trattativa**: puoi chiedere più ingaggio o un ruolo più alto. Le
  probabilità sono dichiarate prima di provarci, una trattativa per club, e
  anche un rifiuto limita qualcosa.
- In fondo, i trasferimenti realmente avvenuti nel mondo di gioco.

### Novità della 0.1.8

- **Ruoli con le stelle** — 18 ruoli (dal _Portiere libero_ al _Falso nove_),
  ognuno valutato 0-5 sulla media pesata degli attributi che quel ruolo
  chiede davvero. I ruoli fuori dalla tua posizione restano in lista, in
  corsivo e con un malus.
- **Caratteristiche** — 24 abitudini ("Si muove negli spazi", "Tira con
  potenza", "Non molla mai"…) che compaiono solo quando **tutti** gli
  attributi che le reggono arrivano a soglia, e si perdono se cali.

Nessuna delle due è memorizzata: entrambe si calcolano dagli attributi, quindi
valgono anche sulle carriere già iniziate e si muovono mentre il giocatore
cresce.

### Novità della 0.1.7

- **Scheda giocatore** 👤 — il profilo completo: identità e stelle in alto, le
  tre colonne di attributi (Tecnica, Psicologia, Fisico) sulla scala 1-20 con
  evidenziati quelli che contano per il tuo ruolo, info fisiche e piede,
  striscia di forma e statistiche di stagione e carriera. Un interruttore
  passa da numeri a parole.
- **Impostazioni** ⚙️ — valuta, dimensione del testo, schermo intero, scene
  accendibili, riduzione delle animazioni, e soprattutto i **salvataggi**:
  copie della partita da cui tornare indietro, con l'automatico **spento
  finché non lo accendi tu**.

### Novità della 0.1.6

- **Una stagione vera: 20 squadre, 38 giornate**, da metà agosto a inizio
  maggio, andata e ritorno. Prima le divisioni ne avevano 12 e il campionato
  finiva a gennaio. (Le carriere già iniziate restano a 12: il numero di club
  si decide quando nasce il mondo.)
- **Il valore decide.** Le occasioni vanno a chi sa sfruttarle, la forza di una
  squadra sente i suoi campioni e il voto premia chi spicca. Con tutti gli
  attributi al massimo si segnano ~39 gol in 38 giornate, più della metà di
  quelli della squadra, con 8,6 di media voto.

### Novità precedenti

- **0.1.5** — ricerca nell'editor del mondo: filtra 22 competizioni e 120 club
  per nome, sigla, campionato e paese; Invio salva la riga.
- **0.1.3–0.1.4** — **presentazione al nuovo club** e **cerimonia di
  premiazione**: due scene animate, disegnate in CSS e SVG nei colori del club.

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
`.github/workflows/release.yml` costruisce le due versioni (Mac Apple Silicon
e Windows) e le pubblica in una **Release di GitHub**: quella pagina è il link
da dare a chi vuole giocare. Basta alzare `version` in `package.json` (è quella
che finisce nel nome dei file) e creare il tag corrispondente:

```bash
git tag -a v0.1.9 -m "Fuoriclasse 0.1.9" && git push origin main --follow-tags
```

Cosa fa `npm run desktop:stage` (il passaggio prima dell'impacchettamento,
in `scripts/build-desktop.mjs`): compila il client web, riduce il server a un
unico file JavaScript con esbuild, copia il client Prisma con il suo motore
nativo e prepara un database vuoto già seedato. L'app installata lo copia al
primo avvio nella cartella dati dell'utente — le carriere non stanno mai dentro
il pacchetto dell'applicazione, che è di sola lettura.

I Mac Intel non sono coperti: i runner `macos-13` sono rimasti in coda per più
di un'ora a ogni tentativo mentre gli altri due finivano in quattro minuti.
Rimettere la voce nella matrice del workflow è tutto ciò che serve, se un
giorno servisse.

Due limiti dichiarati, per onestà: l'installer Windows viene costruito e
verificato come eseguibile valido, ma **non è mai stato eseguito su una macchina
Windows reale** (qui non ce n'è una); e lo storico delle migrazioni Prisma è
incompleto — lo schema si allinea con `prisma db push`, non ricostruendolo dalle
migrazioni.

L'app non è firmata: per i passaggi del primo avvio, vedi
[Scaricare e giocare](#scaricare-e-giocare).

I salvataggi vivono in `~/Library/Application Support/Fuoriclasse/` su macOS
e in `%APPDATA%\Fuoriclasse\` su Windows, con backup automatici a ogni avvio.
Le copie fatte dal giocatore (⚙️ Impostazioni → Salvataggi) stanno lì accanto,
in `snapshots/`, insieme al file `impostazioni.json`.

## Giocare dalla cartella del progetto (senza installer)

Alternativa se si preferisce passare i sorgenti. Servono due cose: **Node.js 20
o superiore** (si scarica da [nodejs.org](https://nodejs.org), installazione
normale "avanti-avanti") e la cartella del gioco.

Poi:

| Sistema     | Cosa fare                                   |
| ----------- | ------------------------------------------- |
| **macOS**   | doppio clic su `scripts/start-game.command` |
| **Windows** | doppio clic su `scripts/start-game.bat`     |

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
