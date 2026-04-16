import { Command } from 'commander';
import { initCommand } from './commands/init';
import { runCommand_ } from './commands/run';
import { stopCommand } from './commands/stop';

const program = new Command();

program
  .name('mempalace-explorer')
  .description('CLI tool to initialize and run MemPalace Explorer')
  .version('1.0.0');

program
  .command('init')
  .description('Install dependencies, set up the database, and build the project')
  .action(async () => {
    await initCommand();
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
    await runCommand_(options);
  });

program
  .command('stop')
  .description('Stop a running MemPalace Explorer instance')
  .action(() => {
    stopCommand();
  });

program.parse();
