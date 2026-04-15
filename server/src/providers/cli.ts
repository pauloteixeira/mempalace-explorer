import { spawn } from 'child_process';
import type { MemPalaceProvider } from './interface';
import type {
  RawTaxonomy,
  Wing,
  Room,
  Drawer,
  DrawerListResponse,
  CreateDrawerInput,
  UpdateDrawerInput,
  SearchOptions,
  SearchResponse,
  GraphData,
  GraphNode,
  GraphEdge,
  KGTriple,
  ConnectionTestResult,
} from '../types';

const TIMEOUT_MS = 30000;

/**
 * Hybrid provider: uses mempalace CLI commands for status/taxonomy,
 * and spawns a short-lived mempalace.mcp_server process per request
 * for operations that require the full MCP JSON-RPC API.
 */
export class CLIProvider implements MemPalaceProvider {
  private command: string;
  private args: string[];

  constructor(command: string, args: string[] = []) {
    this.command = command;
    this.args = args;
  }

  private getMcpServerArgs(): string[] {
    return this.args.map(a =>
      a === 'mempalace' ? 'mempalace.mcp_server' : a,
    );
  }

  private runCli(subcommand: string, extraArgs: string[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, [...this.args, subcommand, ...extraArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      function settle(fn: () => void) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      }

      const timer = setTimeout(() => {
        settle(() => {
          child.kill();
          reject(new Error(`CLI timeout (${TIMEOUT_MS / 1000}s) running: ${subcommand}`));
        });
      }, TIMEOUT_MS);

      child.stdout!.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr!.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      child.on('error', (err) => settle(() => reject(err)));

      child.on('close', (code) => {
        settle(() => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`CLI exited with code ${code}. stderr: ${stderr.slice(0, 300)}`));
          }
        });
      });
    });
  }

  private callTool(toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const mcpArgs = this.getMcpServerArgs();
      const child = spawn(this.command, mcpArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      function settle(fn: () => void) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      }

      const timer = setTimeout(() => {
        settle(() => {
          child.kill();
          reject(new Error(`CLI timeout (${TIMEOUT_MS / 1000}s) calling ${toolName}`));
        });
      }, TIMEOUT_MS);

      child.stdout!.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr!.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      child.on('error', (err) => settle(() => reject(err)));

      const initRequest = JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'mempalace-explorer-cli', version: '1.0.0' },
        },
      });

      const notifyInit = JSON.stringify({
        jsonrpc: '2.0', method: 'notifications/initialized',
      });

      const toolRequest = JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: toolName, arguments: args },
      });

      child.stdin!.write(initRequest + '\n');
      child.stdin!.write(notifyInit + '\n');
      child.stdin!.write(toolRequest + '\n');

      setTimeout(() => {
        try { child.stdin!.end(); } catch {}
      }, 500);

      function tryResolveFromStdout(): boolean {
        const lines = stdout.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (msg.id === 2) {
              if (msg.error) {
                reject(new Error(`MCP error: ${msg.error.message}`));
              } else if (msg.result?.content?.[0]?.text) {
                resolve(JSON.parse(msg.result.content[0].text));
              } else {
                resolve(msg.result);
              }
              return true;
            }
          } catch {}
        }
        return false;
      }

      child.stdout!.on('data', () => {
        if (!settled && tryResolveFromStdout()) {
          settled = true;
          clearTimeout(timer);
          child.kill();
        }
      });

      child.on('close', () => {
        settle(() => {
          if (tryResolveFromStdout()) return;
          reject(new Error(`CLI: no response for ${toolName}. stderr: ${stderr.slice(0, 200)}`));
        });
      });
    });
  }

  private parseStatusTaxonomy(output: string): { totalDrawers: number; taxonomy: RawTaxonomy } {
    const taxonomy: RawTaxonomy = {};
    let totalDrawers = 0;

    const totalMatch = output.match(/(\d+)\s+drawers/i);
    if (totalMatch) totalDrawers = parseInt(totalMatch[1], 10);

    let currentWing = '';
    for (const line of output.split('\n')) {
      const wingMatch = line.match(/^\s*WING:\s+(.+)/);
      if (wingMatch) {
        currentWing = wingMatch[1].trim();
        if (!taxonomy[currentWing]) taxonomy[currentWing] = {};
        continue;
      }
      const roomMatch = line.match(/^\s*ROOM:\s+(\S+)\s+(\d+)\s+drawers/);
      if (roomMatch && currentWing) {
        taxonomy[currentWing][roomMatch[1]] = parseInt(roomMatch[2], 10);
      }
    }

    return { totalDrawers, taxonomy };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const output = await this.runCli('status');
      const { totalDrawers } = this.parseStatusTaxonomy(output);
      return {
        ok: true,
        message: `Connected via CLI. ${totalDrawers} drawers in palace.`,
        provider: 'cli',
      };
    } catch (err) {
      return {
        ok: false,
        message: `CLI connection failed: ${(err as Error).message}`,
        provider: 'cli',
      };
    }
  }

  async getTaxonomy(): Promise<RawTaxonomy> {
    try {
      const output = await this.runCli('status');
      const { taxonomy } = this.parseStatusTaxonomy(output);
      if (Object.keys(taxonomy).length > 0) return taxonomy;
    } catch {}
    const result = await this.callTool('mempalace_get_taxonomy') as { taxonomy: RawTaxonomy };
    return result.taxonomy;
  }

  async listWings(): Promise<Wing[]> {
    const taxonomy = await this.getTaxonomy();
    return Object.entries(taxonomy).map(([name, rooms]) => ({
      name,
      rooms: Object.keys(rooms),
      drawerCount: Object.values(rooms).reduce((sum, c) => sum + c, 0),
    }));
  }

  async listRooms(wing?: string): Promise<Room[]> {
    const taxonomy = await this.getTaxonomy();
    const rooms: Room[] = [];
    const wings = wing ? { [wing]: taxonomy[wing] || {} } : taxonomy;
    for (const [wingName, wingRooms] of Object.entries(wings)) {
      for (const [roomName, count] of Object.entries(wingRooms)) {
        rooms.push({ name: roomName, wing: wingName, drawerCount: count });
      }
    }
    return rooms;
  }

  async listDrawers(wing?: string, room?: string, limit = 20, offset = 0): Promise<DrawerListResponse> {
    const args: Record<string, unknown> = { limit, offset };
    if (wing) args.wing = wing;
    if (room) args.room = room;
    return await this.callTool('mempalace_list_drawers', args) as DrawerListResponse;
  }

  async getDrawer(id: string): Promise<Drawer> {
    return await this.callTool('mempalace_get_drawer', { drawer_id: id }) as Drawer;
  }

  async addDrawer(input: CreateDrawerInput): Promise<Drawer> {
    const result = await this.callTool('mempalace_add_drawer', { ...input }) as {
      drawer_id: string; wing: string; room: string;
    };
    return { ...result, content: input.content };
  }

  async updateDrawer(id: string, updates: UpdateDrawerInput): Promise<Drawer> {
    return await this.callTool('mempalace_update_drawer', {
      drawer_id: id, ...updates,
    }) as Drawer;
  }

  async deleteDrawer(id: string): Promise<void> {
    await this.callTool('mempalace_delete_drawer', { drawer_id: id });
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const args: Record<string, unknown> = { query };
    if (options?.limit) args.limit = options.limit;
    if (options?.wing) args.wing = options.wing;
    if (options?.room) args.room = options.room;
    if (options?.max_distance !== undefined) args.max_distance = options.max_distance;
    return await this.callTool('mempalace_search', args) as SearchResponse;
  }

  async traverse(startRoom: string, maxHops = 2): Promise<GraphData> {
    const raw = await this.callTool('mempalace_traverse', {
      start_room: startRoom, max_hops: maxHops,
    }) as Record<string, unknown>;
    return this.parseGraphData(raw);
  }

  async kgQuery(entity: string, direction = 'both', asOf?: string): Promise<KGTriple[]> {
    const args: Record<string, unknown> = { entity, direction };
    if (asOf) args.as_of = asOf;
    const result = await this.callTool('mempalace_kg_query', args) as {
      facts?: KGTriple[];
    };
    return result.facts || [];
  }

  private parseGraphData(raw: Record<string, unknown>): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seen = new Set<string>();

    const connections = (raw.connections || raw.graph || []) as Array<{
      from?: string; to?: string; from_wing?: string; to_wing?: string; weight?: number;
    }>;
    for (const conn of connections) {
      const fromId = conn.from || '';
      const toId = conn.to || '';
      if (fromId && !seen.has(fromId)) {
        seen.add(fromId);
        nodes.push({ id: fromId, label: fromId, wing: conn.from_wing || '', room: fromId, type: 'room' });
      }
      if (toId && !seen.has(toId)) {
        seen.add(toId);
        nodes.push({ id: toId, label: toId, wing: conn.to_wing || '', room: toId, type: 'room' });
      }
      if (fromId && toId) {
        edges.push({ source: fromId, target: toId, weight: conn.weight });
      }
    }

    return { nodes, edges };
  }
}
