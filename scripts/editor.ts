/**
 * External live editor for Football Life.
 *
 * Run the game first (`npm run dev` or `npm run dev:server`), then in another
 * terminal run `npm run editor`. It talks to the running HTTP API, so every
 * change is applied to the live save immediately (refresh the web UI to see it).
 *
 * Configure the target with EDITOR_API_URL (default http://localhost:3001).
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

const money = (value: number): string => `€${value.toLocaleString('en-US')}`;

function printHelp(): void {
  console.log(`
Commands:
  status                 show the player and balance
  money <amount>         grant (or, if negative, deduct) money
  set <field> <value>    set a player value
  attr <key> <value>     set an attribute (e.g. attr finishing 90)
  career <STATUS>        set career status (YOUTH/ACTIVE/INJURED/RETIRED/UNEMPLOYED)
  help                   show this help
  quit                   exit
Player fields: ${[...PLAYER_FIELDS].join(', ')}
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
    `  ability ${Math.round(Number(player.currentAbility))}/${Math.round(
      Number(player.potentialAbility),
    )} · morale ${Math.round(Number(player.morale))} · condition ${Math.round(
      Number(player.condition),
    )} · stress ${Math.round(Number(player.stress))}`,
  );
  console.log(`  balance ${money(Number(finance.balance))}\n`);
}

async function runCommand(saveId: string, line: string): Promise<boolean> {
  const [command, ...rest] = line.trim().split(/\s+/);
  switch (command) {
    case '':
      return true;
    case 'quit':
    case 'exit':
    case 'q':
      return false;
    case 'help':
    case 'h':
      printHelp();
      return true;
    case 'status':
    case 's':
      await showStatus(saveId);
      return true;
    case 'money': {
      const amount = Number(rest[0]);
      if (!Number.isFinite(amount)) throw new Error('usage: money <amount>');
      const result = await http('POST', `/api/saves/${saveId}/finance`, {
        amount,
      });
      console.log(`balance: ${money(Number(result.balance))}`);
      return true;
    }
    case 'set': {
      const field = rest[0];
      const value = Number(rest[1]);
      if (!field || !PLAYER_FIELDS.has(field) || !Number.isFinite(value)) {
        throw new Error(
          `usage: set <field> <value> (fields: ${[...PLAYER_FIELDS].join(', ')})`,
        );
      }
      await http('PATCH', `/api/saves/${saveId}/player`, { [field]: value });
      console.log(`set ${field} = ${value}`);
      return true;
    }
    case 'attr': {
      const key = rest[0];
      const value = Number(rest[1]);
      if (!key || !Number.isFinite(value)) {
        throw new Error('usage: attr <key> <value>');
      }
      await http('PATCH', `/api/saves/${saveId}/player`, {
        attributes: [{ key, value }],
      });
      console.log(`set attribute ${key} = ${value}`);
      return true;
    }
    case 'career': {
      const status = rest[0];
      if (!status) throw new Error('usage: career <STATUS>');
      await http('PATCH', `/api/saves/${saveId}/player`, {
        careerStatus: status.toUpperCase(),
      });
      console.log(`career status = ${status.toUpperCase()}`);
      return true;
    }
    default:
      console.log(`Unknown command "${command}". Type "help".`);
      return true;
  }
}

async function main(): Promise<void> {
  try {
    await http('GET', '/health');
  } catch {
    console.error(
      `Cannot reach the game API at ${BASE}. Start it first (npm run dev:server).`,
    );
    process.exit(1);
  }

  const saves = (await http('GET', '/api/saves')) as unknown as {
    id: string;
    name: string;
    currentDate: string;
  }[];
  if (!Array.isArray(saves) || saves.length === 0) {
    console.error('No saved careers found. Create one in the game first.');
    process.exit(1);
  }

  console.log('Football Life — external live editor\n');
  saves.forEach((save, index) => {
    console.log(
      `  [${index}] ${save.name}  (${save.currentDate.slice(0, 10)})`,
    );
  });

  const rl = createInterface({ input, output });
  output.write('\nSelect a save #: ');

  let selected: { id: string; name: string } | null = null;
  // Iterating the interface handles both interactive input and piped EOF.
  for await (const raw of rl) {
    const line = raw.trim();
    if (!selected) {
      selected = saves[Number(line)] ?? null;
      if (!selected) {
        console.error('Invalid selection.');
        break;
      }
      console.log(`\nEditing "${selected.name}". Type "help" for commands.`);
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
  console.log('\nBye.');
}

void main();
