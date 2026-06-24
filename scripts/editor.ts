/**
 * Editor esterno live per Football Life.
 *
 * Avvia prima il gioco (`npm run dev` o `npm run dev:server`), poi in un altro
 * terminale esegui `npm run editor`. Comunica con l'API HTTP in esecuzione,
 * quindi ogni modifica è applicata al salvataggio in tempo reale (aggiorna la
 * UI per vederla). Host configurabile con EDITOR_API_URL (default :3001).
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const BASE = process.env.EDITOR_API_URL ?? 'http://localhost:3001';

const PLAYER_FIELDS = new Set([
  'currentAbility',
  'potentialAbility',
  'condition',
  'fatigue',
  'morale',
  'form',
  'stress',
  'motivation',
  'reputation',
  'popularity',
  'marketValue',
]);

async function http(
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    throw new Error(
      `${response.status} ${String(json.error ?? response.statusText)}`,
    );
  }
  return json;
}

const money = (value: number): string => `€${value.toLocaleString('it-IT')}`;

function printHelp(): void {
  console.log(`
Comandi:
  stato                  mostra il giocatore e il saldo
  soldi <importo>        accredita (o, se negativo, scala) denaro
  imposta <campo> <val>  imposta un valore del giocatore
  attributo <chiave> <val>  imposta un attributo (es. attributo finishing 90)
  carriera <STATO>       stato di carriera (YOUTH/ACTIVE/INJURED/RETIRED/UNEMPLOYED)
  aiuto                  mostra questo aiuto
  esci                   esci
Campi giocatore: ${[...PLAYER_FIELDS].join(', ')}
`);
}

async function showStatus(saveId: string): Promise<void> {
  const dashboard = await http('GET', `/api/saves/${saveId}/dashboard`);
  const finance = await http('GET', `/api/saves/${saveId}/finance`);
  const player = dashboard.player as Record<string, unknown>;
  console.log(
    `\n${String(player.firstName)} ${String(player.lastName)} — ${String(player.careerStatus)}`,
  );
  console.log(
    `  abilità ${Math.round(Number(player.currentAbility))}/${Math.round(
      Number(player.potentialAbility),
    )} · morale ${Math.round(Number(player.morale))} · condizione ${Math.round(
      Number(player.condition),
    )} · stress ${Math.round(Number(player.stress))}`,
  );
  console.log(`  saldo ${money(Number(finance.balance))}\n`);
}

async function runCommand(saveId: string, line: string): Promise<boolean> {
  const [command, ...rest] = line.trim().split(/\s+/);
  switch (command) {
    case '':
      return true;
    case 'esci':
    case 'quit':
    case 'exit':
    case 'q':
      return false;
    case 'aiuto':
    case 'help':
    case 'h':
      printHelp();
      return true;
    case 'stato':
    case 'status':
    case 's':
      await showStatus(saveId);
      return true;
    case 'soldi':
    case 'money': {
      const amount = Number(rest[0]);
      if (!Number.isFinite(amount)) throw new Error('uso: soldi <importo>');
      const result = await http('POST', `/api/saves/${saveId}/finance`, {
        amount,
      });
      console.log(`saldo: ${money(Number(result.balance))}`);
      return true;
    }
    case 'imposta':
    case 'set': {
      const field = rest[0];
      const value = Number(rest[1]);
      if (!field || !PLAYER_FIELDS.has(field) || !Number.isFinite(value)) {
        throw new Error(
          `uso: imposta <campo> <valore> (campi: ${[...PLAYER_FIELDS].join(', ')})`,
        );
      }
      await http('PATCH', `/api/saves/${saveId}/player`, { [field]: value });
      console.log(`impostato ${field} = ${value}`);
      return true;
    }
    case 'attributo':
    case 'attr': {
      const key = rest[0];
      const value = Number(rest[1]);
      if (!key || !Number.isFinite(value)) {
        throw new Error('uso: attributo <chiave> <valore>');
      }
      await http('PATCH', `/api/saves/${saveId}/player`, {
        attributes: [{ key, value }],
      });
      console.log(`attributo ${key} = ${value}`);
      return true;
    }
    case 'carriera':
    case 'career': {
      const status = rest[0];
      if (!status) throw new Error('uso: carriera <STATO>');
      await http('PATCH', `/api/saves/${saveId}/player`, {
        careerStatus: status.toUpperCase(),
      });
      console.log(`stato carriera = ${status.toUpperCase()}`);
      return true;
    }
    default:
      console.log(`Comando sconosciuto "${command}". Digita "aiuto".`);
      return true;
  }
}

async function main(): Promise<void> {
  try {
    await http('GET', '/health');
  } catch {
    console.error(
      `Impossibile raggiungere l'API del gioco a ${BASE}. Avvialo prima (npm run dev:server).`,
    );
    process.exit(1);
  }

  const saves = (await http('GET', '/api/saves')) as unknown as {
    id: string;
    name: string;
    currentDate: string;
  }[];
  if (!Array.isArray(saves) || saves.length === 0) {
    console.error('Nessuna carriera salvata. Creane una nel gioco.');
    process.exit(1);
  }

  console.log('Football Life — editor esterno live\n');
  saves.forEach((save, index) => {
    console.log(
      `  [${index}] ${save.name}  (${save.currentDate.slice(0, 10)})`,
    );
  });

  const rl = createInterface({ input, output });
  output.write('\nSeleziona un salvataggio #: ');

  let selected: { id: string; name: string } | null = null;
  // Iterare l'interfaccia gestisce sia l'input interattivo sia l'EOF da pipe.
  for await (const raw of rl) {
    const line = raw.trim();
    if (!selected) {
      selected = saves[Number(line)] ?? null;
      if (!selected) {
        console.error('Selezione non valida.');
        break;
      }
      console.log(
        `\nModifica di "${selected.name}". Digita "aiuto" per i comandi.`,
      );
      await showStatus(selected.id);
      output.write('editor> ');
      continue;
    }
    try {
      const keepGoing = await runCommand(selected.id, line);
      if (!keepGoing) break;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
    output.write('editor> ');
  }

  rl.close();
  console.log('\nArrivederci.');
}

void main();
