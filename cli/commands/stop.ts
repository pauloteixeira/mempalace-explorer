import { execSync } from 'child_process';
import { log, logSuccess, logError, readPidFile, removePidFile, isProcessRunning } from '../utils';

export function stopCommand(): void {
  const pid = readPidFile();

  if (!pid) {
    logError('No running MemPalace Explorer instance found.');
    return;
  }

  if (!isProcessRunning(pid)) {
    log(`Process ${pid} is no longer running. Cleaning up.`);
    removePidFile();
    return;
  }

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
    removePidFile();
    logSuccess(`MemPalace Explorer stopped (PID ${pid}).`);
  } catch (err: any) {
    removePidFile();
    if (err.message?.includes('not found') || err.status === 128) {
      logSuccess(`MemPalace Explorer stopped (PID ${pid}).`);
    } else {
      logError(`Failed to stop process ${pid}: ${err.message}`);
      log('You may need to stop it manually.');
    }
  }
}
