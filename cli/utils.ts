import { spawn, SpawnOptions } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';

const PID_FILE = '.mempalace-explorer.pid';

export function getProjectRoot(): string {
  let dir = __dirname;
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'package.json')) && existsSync(resolve(dir, 'server')) && existsSync(resolve(dir, 'client'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  throw new Error('Could not locate mempalace-explorer project root. Make sure you are inside the project directory.');
}

export function getPidFilePath(): string {
  return resolve(getProjectRoot(), PID_FILE);
}

export function writePidFile(pid: number): void {
  writeFileSync(getPidFilePath(), String(pid), 'utf-8');
}

export function readPidFile(): number | null {
  const pidPath = getPidFilePath();
  if (!existsSync(pidPath)) return null;
  const raw = readFileSync(pidPath, 'utf-8').trim();
  const pid = parseInt(raw, 10);
  return isNaN(pid) ? null : pid;
}

export function removePidFile(): void {
  const pidPath = getPidFilePath();
  if (existsSync(pidPath)) unlinkSync(pidPath);
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function log(message: string): void {
  console.log(`\x1b[36m[mempalace-explorer]\x1b[0m ${message}`);
}

export function logSuccess(message: string): void {
  console.log(`\x1b[32m✔\x1b[0m ${message}`);
}

export function logError(message: string): void {
  console.error(`\x1b[31m✖\x1b[0m ${message}`);
}

export function logStep(step: number, total: number, message: string): void {
  console.log(`\x1b[36m[${step}/${total}]\x1b[0m ${message}`);
}

export function runCommand(command: string, args: string[], options: SpawnOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows,
      ...options,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start command "${command}": ${err.message}`));
    });
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export async function runWithRetry(
  command: string,
  args: string[],
  options: SpawnOptions = {},
  retries = 2,
  delayMs = 3000,
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await runCommand(command, args, options);
      return;
    } catch (err) {
      if (attempt < retries) {
        log(`Retrying in ${delayMs / 1000}s... (attempt ${attempt + 2}/${retries + 1})`);
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
}

export function openBrowser(url: string): void {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true, windowsHide: true }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    log(`Could not open browser automatically. Visit ${url}`);
  }
}

export function isInitialized(root: string): boolean {
  const checks = [
    resolve(root, 'node_modules'),
    resolve(root, 'server', 'dist', 'index.js'),
    resolve(root, 'client', 'dist', 'index.html'),
  ];
  return checks.every((p) => existsSync(p));
}
