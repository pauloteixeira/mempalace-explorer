"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopCommand = stopCommand;
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
function stopCommand() {
    const pid = (0, utils_1.readPidFile)();
    if (!pid) {
        (0, utils_1.logError)('No running MemPalace Explorer instance found.');
        return;
    }
    if (!(0, utils_1.isProcessRunning)(pid)) {
        (0, utils_1.log)(`Process ${pid} is no longer running. Cleaning up.`);
        (0, utils_1.removePidFile)();
        return;
    }
    try {
        if (process.platform === 'win32') {
            (0, child_process_1.execSync)(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        }
        else {
            process.kill(-pid, 'SIGTERM');
        }
        (0, utils_1.removePidFile)();
        (0, utils_1.logSuccess)(`MemPalace Explorer stopped (PID ${pid}).`);
    }
    catch (err) {
        (0, utils_1.removePidFile)();
        if (err.message?.includes('not found') || err.status === 128) {
            (0, utils_1.logSuccess)(`MemPalace Explorer stopped (PID ${pid}).`);
        }
        else {
            (0, utils_1.logError)(`Failed to stop process ${pid}: ${err.message}`);
            (0, utils_1.log)('You may need to stop it manually.');
        }
    }
}
