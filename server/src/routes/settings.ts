import { Router, Request, Response } from 'express';
import prisma from '../db';
import { getProviderConfig, refreshProvider, createProviderForTest, getProvider } from '../providers/factory';
import type { ProviderType } from '../types';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await getProviderConfig();
    const allSettings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of allSettings) map[s.key] = s.value;

    res.json({
      provider: config.provider,
      mcp_command: config.mcpCommand,
      mcp_args: config.mcpArgs,
      cli_command: config.cliCommand,
      cli_args: config.cliArgs,
      configured: config.configured,
      all: map,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { provider, mcp_command, mcp_args, cli_command, cli_args, theme, prompt_template } = req.body as {
      provider?: ProviderType;
      mcp_command?: string;
      mcp_args?: string;
      cli_command?: string;
      cli_args?: string;
      theme?: string;
      prompt_template?: string;
    };

    const upserts: Array<{ key: string; value: string }> = [];
    if (provider) upserts.push({ key: 'provider', value: provider });
    if (mcp_command !== undefined) upserts.push({ key: 'mcp_command', value: mcp_command });
    if (mcp_args !== undefined) upserts.push({ key: 'mcp_args', value: mcp_args });
    if (cli_command !== undefined) upserts.push({ key: 'cli_command', value: cli_command });
    if (cli_args !== undefined) upserts.push({ key: 'cli_args', value: cli_args });
    if (theme) upserts.push({ key: 'theme', value: theme });
    if (prompt_template !== undefined) upserts.push({ key: 'prompt_template', value: prompt_template });

    for (const { key, value } of upserts) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    await refreshProvider();

    const config = await getProviderConfig();
    res.json({
      provider: config.provider,
      mcp_command: config.mcpCommand,
      mcp_args: config.mcpArgs,
      cli_command: config.cliCommand,
      cli_args: config.cliArgs,
      configured: config.configured,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/test-connection', async (req: Request, res: Response) => {
  try {
    const type = (req.query.provider as ProviderType) || (await getProviderConfig()).provider;
    const command = req.query.command as string | undefined;
    const args = req.query.args as string | undefined;

    let testCommand: string;
    let testArgs: string;

    if (command && args) {
      testCommand = command;
      testArgs = args;
    } else {
      const config = await getProviderConfig();
      testCommand = type === 'cli' ? config.cliCommand : config.mcpCommand;
      testArgs = type === 'cli' ? config.cliArgs : config.mcpArgs;
    }

    const provider = await createProviderForTest(type, testCommand, testArgs);
    const result = await provider.testConnection();

    if ('disconnect' in provider) {
      (provider as { disconnect: () => void }).disconnect();
    }

    res.json(result);
  } catch (err) {
    res.json({ ok: false, message: (err as Error).message, provider: 'unknown' });
  }
});

router.post('/reconnect', async (_req: Request, res: Response) => {
  try {
    const config = await getProviderConfig();
    if (!config.configured) {
      res.json({ ok: false, status: 'unconfigured', provider: config.provider });
      return;
    }

    const provider = await refreshProvider();
    const result = await provider.testConnection();
    res.json({
      ok: result.ok,
      status: result.ok ? 'connected' : 'disconnected',
      provider: config.provider,
      message: result.message,
    });
  } catch (err) {
    res.json({
      ok: false,
      status: 'disconnected',
      provider: 'unknown',
      message: (err as Error).message,
    });
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const config = await getProviderConfig();
    if (!config.configured) {
      res.json({ ok: false, status: 'unconfigured', provider: config.provider });
      return;
    }

    const provider = await getProvider();
    const result = await provider.testConnection();
    res.json({ ok: result.ok, status: result.ok ? 'connected' : 'disconnected', provider: config.provider, message: result.message });
  } catch (err) {
    res.json({ ok: false, status: 'disconnected', provider: 'unknown', message: (err as Error).message });
  }
});

export default router;
