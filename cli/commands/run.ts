import { resolve } from 'path';
import { spawn } from 'child_process';
import {
  getProjectRoot, log, logError, logSuccess, runCommand,
  openBrowser, isInitialized, writePidFile, readPidFile,
  isProcessRunning, removePidFile,
} from '../utils';

interface RunOptions {
  port: string;
  frontPort: string;
  dev: boolean;
  detach: boolean;
  open: boolean;
}

function spawnDetached(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): number {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: 'ignore',
    detached: true,
    shell: false,
    windowsHide: true,
  });
  child.unref();
  return child.pid!;
}

function resolveExecutable(name: string): string {
  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    return execSync(`where ${name}`, { encoding: 'utf-8' }).split(/\r?\n/)[0].trim();
  }
  const { execSync } = require('child_process');
  return execSync(`which ${name}`, { encoding: 'utf-8' }).trim();
}

export async function runCommand_(options: RunOptions): Promise<void> {
  const root = getProjectRoot();
  const serverPort = options.port;
  const frontPort = options.frontPort;

  if (options.open) {
    options.detach = true;
  }

  if (!options.dev && !isInitialized(root)) {
    logError('Project has not been initialized yet.');
    log('Run \x1b[1mmempalace-explorer init\x1b[0m first.');
    process.exit(1);
  }

  const existingPid = readPidFile();
  if (existingPid && isProcessRunning(existingPid)) {
    logError(`MemPalace Explorer is already running (PID ${existingPid}).`);
    log('Run \x1b[1mmempalace-explorer stop\x1b[0m first, or use a different port.');
    process.exit(1);
  }
  removePidFile();

  try {
    if (options.dev) {
      log(`Starting in development mode...`);
      log(`Server: http://localhost:${serverPort}`);
      log(`Client: http://localhost:${frontPort}`);
      console.log('');

      const env = {
        ...process.env,
        PORT: serverPort,
        SERVER_PORT: serverPort,
        FRONT_PORT: frontPort,
      };

      if (options.detach) {
        const npxPath = resolveExecutable('npx');
        const pid = spawnDetached(npxPath, [
          'concurrently',
          '-n', 'server,client',
          '-c', 'blue,green',
          'npm run dev -w server',
          'npm run dev -w client',
        ], root, env as NodeJS.ProcessEnv);
        writePidFile(pid);
        logSuccess(`Running in background (PID ${pid}).`);
        log(`Server: http://localhost:${serverPort}`);
        log(`Client: http://localhost:${frontPort}`);
        log('Run \x1b[1mmempalace-explorer stop\x1b[0m to stop.');
        if (options.open) {
          setTimeout(() => { openBrowser(`http://localhost:${frontPort}`); process.exit(0); }, 4000);
        }
        return;
      }

      if (options.open) {
        setTimeout(() => openBrowser(`http://localhost:${frontPort}`), 4000);
      }

      await runCommand('npx', [
        'concurrently',
        '-n', 'server,client',
        '-c', 'blue,green',
        'npm run dev -w server',
        'npm run dev -w client',
      ], { cwd: root, env });
    } else {
      log(`Starting MemPalace Explorer on http://localhost:${serverPort}`);
      console.log('');

      const env = {
        ...process.env,
        PORT: serverPort,
        NODE_ENV: 'production',
      };

      if (options.detach) {
        const nodeExe = process.execPath;
        const pid = spawnDetached(nodeExe, [resolve(root, 'server', 'dist', 'index.js')], root, env as NodeJS.ProcessEnv);
        writePidFile(pid);
        logSuccess(`Running in background (PID ${pid}).`);
        log(`http://localhost:${serverPort}`);
        log('Run \x1b[1mmempalace-explorer stop\x1b[0m to stop.');
        if (options.open) {
          setTimeout(() => { openBrowser(`http://localhost:${serverPort}`); process.exit(0); }, 2000);
        }
        return;
      }

      if (options.open) {
        setTimeout(() => openBrowser(`http://localhost:${serverPort}`), 2000);
      }

      await runCommand('node', [resolve(root, 'server', 'dist', 'index.js')], { cwd: root, env });
    }
  } catch (err: any) {
    logError(`Failed to start: ${err.message}`);
    process.exit(1);
  }
}
