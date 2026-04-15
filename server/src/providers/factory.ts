import prisma from '../db';
import type { MemPalaceProvider } from './interface';
import type { ProviderType } from '../types';
import { MCPClientProvider } from './mcp-client';
import { CLIProvider } from './cli';

const DEFAULT_MCP_COMMAND = 'python3';
const DEFAULT_MCP_ARGS = '-m mempalace.mcp_server';
const DEFAULT_CLI_COMMAND = 'python3';
const DEFAULT_CLI_ARGS = '-m mempalace';

let cachedProvider: MemPalaceProvider | null = null;
let cachedProviderType: ProviderType | null = null;

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

function parseArgs(argsStr: string): string[] {
  return argsStr.split(/\s+/).filter(Boolean);
}

export async function getProviderConfig(): Promise<{
  provider: ProviderType;
  mcpCommand: string;
  mcpArgs: string;
  cliCommand: string;
  cliArgs: string;
  configured: boolean;
}> {
  const provider = (await getSetting('provider')) as ProviderType | null;
  const mcpCommand = (await getSetting('mcp_command')) || DEFAULT_MCP_COMMAND;
  const mcpArgs = (await getSetting('mcp_args')) || DEFAULT_MCP_ARGS;
  const cliCommand = (await getSetting('cli_command')) || DEFAULT_CLI_COMMAND;
  const cliArgs = (await getSetting('cli_args')) || DEFAULT_CLI_ARGS;

  return {
    provider: provider || 'mcp',
    mcpCommand,
    mcpArgs,
    cliCommand,
    cliArgs,
    configured: provider !== null,
  };
}

export async function getProvider(): Promise<MemPalaceProvider> {
  const config = await getProviderConfig();

  if (cachedProvider && cachedProviderType === config.provider) {
    return cachedProvider;
  }

  if (cachedProvider && 'disconnect' in cachedProvider) {
    (cachedProvider as MCPClientProvider).disconnect();
  }

  if (config.provider === 'cli') {
    cachedProvider = new CLIProvider(config.cliCommand, parseArgs(config.cliArgs));
  } else {
    cachedProvider = new MCPClientProvider(config.mcpCommand, parseArgs(config.mcpArgs));
  }

  cachedProviderType = config.provider;
  return cachedProvider;
}

export async function refreshProvider(): Promise<MemPalaceProvider> {
  if (cachedProvider && 'disconnect' in cachedProvider) {
    (cachedProvider as MCPClientProvider).disconnect();
  }
  cachedProvider = null;
  cachedProviderType = null;
  return getProvider();
}

export async function createProviderForTest(
  type: ProviderType,
  command: string,
  args: string,
): Promise<MemPalaceProvider> {
  const parsedArgs = parseArgs(args);
  if (type === 'cli') {
    return new CLIProvider(command, parsedArgs);
  }
  return new MCPClientProvider(command, parsedArgs);
}
