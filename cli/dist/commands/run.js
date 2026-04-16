"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand_ = runCommand_;
const path_1 = require("path");
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
function spawnDetached(command, args, cwd, env) {
    const child = (0, child_process_1.spawn)(command, args, {
        cwd,
        env,
        stdio: 'ignore',
        detached: true,
        shell: false,
        windowsHide: true,
    });
    child.unref();
    return child.pid;
}
function resolveExecutable(name) {
    if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        return execSync(`where ${name}`, { encoding: 'utf-8' }).split(/\r?\n/)[0].trim();
    }
    const { execSync } = require('child_process');
    return execSync(`which ${name}`, { encoding: 'utf-8' }).trim();
}
async function runCommand_(options) {
    const root = (0, utils_1.getProjectRoot)();
    const serverPort = options.port;
    const frontPort = options.frontPort;
    if (options.open) {
        options.detach = true;
    }
    if (!options.dev && !(0, utils_1.isInitialized)(root)) {
        (0, utils_1.logError)('Project has not been initialized yet.');
        (0, utils_1.log)('Run \x1b[1mmempalace-explorer init\x1b[0m first.');
        process.exit(1);
    }
    const existingPid = (0, utils_1.readPidFile)();
    if (existingPid && (0, utils_1.isProcessRunning)(existingPid)) {
        (0, utils_1.logError)(`MemPalace Explorer is already running (PID ${existingPid}).`);
        (0, utils_1.log)('Run \x1b[1mmempalace-explorer stop\x1b[0m first, or use a different port.');
        process.exit(1);
    }
    (0, utils_1.removePidFile)();
    try {
        if (options.dev) {
            (0, utils_1.log)(`Starting in development mode...`);
            (0, utils_1.log)(`Server: http://localhost:${serverPort}`);
            (0, utils_1.log)(`Client: http://localhost:${frontPort}`);
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
                ], root, env);
                (0, utils_1.writePidFile)(pid);
                (0, utils_1.logSuccess)(`Running in background (PID ${pid}).`);
                (0, utils_1.log)(`Server: http://localhost:${serverPort}`);
                (0, utils_1.log)(`Client: http://localhost:${frontPort}`);
                (0, utils_1.log)('Run \x1b[1mmempalace-explorer stop\x1b[0m to stop.');
                if (options.open) {
                    setTimeout(() => { (0, utils_1.openBrowser)(`http://localhost:${frontPort}`); process.exit(0); }, 4000);
                }
                return;
            }
            if (options.open) {
                setTimeout(() => (0, utils_1.openBrowser)(`http://localhost:${frontPort}`), 4000);
            }
            await (0, utils_1.runCommand)('npx', [
                'concurrently',
                '-n', 'server,client',
                '-c', 'blue,green',
                'npm run dev -w server',
                'npm run dev -w client',
            ], { cwd: root, env });
        }
        else {
            (0, utils_1.log)(`Starting MemPalace Explorer on http://localhost:${serverPort}`);
            console.log('');
            const env = {
                ...process.env,
                PORT: serverPort,
                NODE_ENV: 'production',
            };
            if (options.detach) {
                const nodeExe = process.execPath;
                const pid = spawnDetached(nodeExe, [(0, path_1.resolve)(root, 'server', 'dist', 'index.js')], root, env);
                (0, utils_1.writePidFile)(pid);
                (0, utils_1.logSuccess)(`Running in background (PID ${pid}).`);
                (0, utils_1.log)(`http://localhost:${serverPort}`);
                (0, utils_1.log)('Run \x1b[1mmempalace-explorer stop\x1b[0m to stop.');
                if (options.open) {
                    setTimeout(() => { (0, utils_1.openBrowser)(`http://localhost:${serverPort}`); process.exit(0); }, 2000);
                }
                return;
            }
            if (options.open) {
                setTimeout(() => (0, utils_1.openBrowser)(`http://localhost:${serverPort}`), 2000);
            }
            await (0, utils_1.runCommand)('node', [(0, path_1.resolve)(root, 'server', 'dist', 'index.js')], { cwd: root, env });
        }
    }
    catch (err) {
        (0, utils_1.logError)(`Failed to start: ${err.message}`);
        process.exit(1);
    }
}
