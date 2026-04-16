"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectRoot = getProjectRoot;
exports.getPidFilePath = getPidFilePath;
exports.writePidFile = writePidFile;
exports.readPidFile = readPidFile;
exports.removePidFile = removePidFile;
exports.isProcessRunning = isProcessRunning;
exports.log = log;
exports.logSuccess = logSuccess;
exports.logError = logError;
exports.logStep = logStep;
exports.runCommand = runCommand;
exports.sleep = sleep;
exports.runWithRetry = runWithRetry;
exports.openBrowser = openBrowser;
exports.isInitialized = isInitialized;
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_1 = require("fs");
const PID_FILE = '.mempalace-explorer.pid';
function getProjectRoot() {
    let dir = __dirname;
    while (dir !== (0, path_1.dirname)(dir)) {
        if ((0, fs_1.existsSync)((0, path_1.resolve)(dir, 'package.json')) && (0, fs_1.existsSync)((0, path_1.resolve)(dir, 'server')) && (0, fs_1.existsSync)((0, path_1.resolve)(dir, 'client'))) {
            return dir;
        }
        dir = (0, path_1.dirname)(dir);
    }
    throw new Error('Could not locate mempalace-explorer project root. Make sure you are inside the project directory.');
}
function getPidFilePath() {
    return (0, path_1.resolve)(getProjectRoot(), PID_FILE);
}
function writePidFile(pid) {
    (0, fs_1.writeFileSync)(getPidFilePath(), String(pid), 'utf-8');
}
function readPidFile() {
    const pidPath = getPidFilePath();
    if (!(0, fs_1.existsSync)(pidPath))
        return null;
    const raw = (0, fs_1.readFileSync)(pidPath, 'utf-8').trim();
    const pid = parseInt(raw, 10);
    return isNaN(pid) ? null : pid;
}
function removePidFile() {
    const pidPath = getPidFilePath();
    if ((0, fs_1.existsSync)(pidPath))
        (0, fs_1.unlinkSync)(pidPath);
}
function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function log(message) {
    console.log(`\x1b[36m[mempalace-explorer]\x1b[0m ${message}`);
}
function logSuccess(message) {
    console.log(`\x1b[32m✔\x1b[0m ${message}`);
}
function logError(message) {
    console.error(`\x1b[31m✖\x1b[0m ${message}`);
}
function logStep(step, total, message) {
    console.log(`\x1b[36m[${step}/${total}]\x1b[0m ${message}`);
}
function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const proc = (0, child_process_1.spawn)(command, args, {
            stdio: 'inherit',
            shell: isWindows,
            ...options,
        });
        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`));
            }
        });
        proc.on('error', (err) => {
            reject(new Error(`Failed to start command "${command}": ${err.message}`));
        });
    });
}
function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}
async function runWithRetry(command, args, options = {}, retries = 2, delayMs = 3000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await runCommand(command, args, options);
            return;
        }
        catch (err) {
            if (attempt < retries) {
                log(`Retrying in ${delayMs / 1000}s... (attempt ${attempt + 2}/${retries + 1})`);
                await sleep(delayMs);
            }
            else {
                throw err;
            }
        }
    }
}
function openBrowser(url) {
    try {
        if (process.platform === 'win32') {
            (0, child_process_1.spawn)('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true, windowsHide: true }).unref();
        }
        else if (process.platform === 'darwin') {
            (0, child_process_1.spawn)('open', [url], { stdio: 'ignore', detached: true }).unref();
        }
        else {
            (0, child_process_1.spawn)('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
        }
    }
    catch {
        log(`Could not open browser automatically. Visit ${url}`);
    }
}
function isInitialized(root) {
    const checks = [
        (0, path_1.resolve)(root, 'node_modules'),
        (0, path_1.resolve)(root, 'server', 'dist', 'index.js'),
        (0, path_1.resolve)(root, 'client', 'dist', 'index.html'),
    ];
    return checks.every((p) => (0, fs_1.existsSync)(p));
}
