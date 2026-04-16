#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const run_1 = require("./commands/run");
const stop_1 = require("./commands/stop");
const program = new commander_1.Command();
program
    .name('mempalace-explorer')
    .description('CLI tool to initialize and run MemPalace Explorer')
    .version('1.0.0');
program
    .command('init')
    .description('Install dependencies, set up the database, and build the project')
    .action(async () => {
    await (0, init_1.initCommand)();
});
program
    .command('run')
    .description('Start the MemPalace Explorer application')
    .option('-p, --port <number>', 'Server port', '3001')
    .option('--front-port <number>', 'Frontend dev server port (only with --dev)', '5173')
    .option('-d, --detach', 'Run in background (detached mode)', false)
    .option('-D, --dev', 'Start in development mode with HMR', false)
    .option('-o, --open', 'Open browser automatically', false)
    .action(async (options) => {
    await (0, run_1.runCommand_)(options);
});
program
    .command('stop')
    .description('Stop a running MemPalace Explorer instance')
    .action(() => {
    (0, stop_1.stopCommand)();
});
program.parse();
