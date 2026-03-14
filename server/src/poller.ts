import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GT_DIR = process.env.GT_DIR ?? findGtDir();
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 7000);

function findGtDir(): string {
  // Walk up from cwd looking for a .gt marker, default to ~/gt
  return process.env.HOME ? `${process.env.HOME}/gt` : "/tmp/gt";
}

interface PollResult {
  status: unknown | null;
  polecats: unknown[] | null;
  beads: unknown[] | null;
  rigs: unknown[] | null;
  lastUpdated: string;
  errors: string[];
}

let cached: PollResult = {
  status: null,
  polecats: null,
  beads: null,
  rigs: null,
  lastUpdated: new Date().toISOString(),
  errors: [],
};

let polling = false;
let onChange: ((state: PollResult) => void) | null = null;

export function onStateChange(cb: (state: PollResult) => void): void {
  onChange = cb;
}

async function runCmd(
  cmd: string,
  args: string[],
): Promise<{ data: unknown | null; error: string | null }> {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      cwd: GT_DIR,
      timeout: 15_000,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { data: JSON.parse(stdout), error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: `${cmd} ${args.join(" ")}: ${msg}` };
  }
}

async function poll(): Promise<void> {
  const errors: string[] = [];

  const [statusResult, polecatResult, beadsResult, rigsResult] =
    await Promise.all([
      runCmd("gt", ["status", "--json"]),
      runCmd("gt", ["polecat", "list", "--all", "--json"]),
      runCmd("bd", ["list", "--json"]),
      runCmd("gt", ["rig", "list", "--json"]),
    ]);

  if (statusResult.error) errors.push(statusResult.error);
  if (polecatResult.error) errors.push(polecatResult.error);
  if (beadsResult.error) errors.push(beadsResult.error);
  if (rigsResult.error) errors.push(rigsResult.error);

  cached = {
    status: statusResult.data,
    polecats: polecatResult.data as unknown[] | null,
    beads: beadsResult.data as unknown[] | null,
    rigs: rigsResult.data as unknown[] | null,
    lastUpdated: new Date().toISOString(),
    errors,
  };

  onChange?.(cached);
}

export function startPolling(): void {
  if (polling) return;
  polling = true;

  // Initial poll immediately
  poll().catch((err) => {
    console.error("Initial poll failed:", err);
  });

  // Then poll on interval
  setInterval(() => {
    poll().catch((err) => {
      console.error("Poll failed:", err);
    });
  }, POLL_INTERVAL_MS);

  console.log(
    `Polling gt/bd every ${POLL_INTERVAL_MS}ms (GT_DIR=${GT_DIR})`,
  );
}

export function getState(): PollResult {
  return cached;
}
