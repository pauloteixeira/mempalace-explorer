import { spawn, ChildProcess } from 'child_process';
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

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export class MCPClientProvider implements MemPalaceProvider {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private buffer = '';
  private connected = false;
  private command: string;
  private args: string[];

  constructor(command: string, args: string[] = []) {
    this.command = command;
    this.args = args;
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected && this.process && !this.process.killed) return;
    await this.connect();
  }

  private async connect(): Promise<void> {
    this.disconnect();

    this.process = spawn(this.command, this.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    this.process.stdout!.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.processBuffer();
    });

    this.process.on('exit', () => {
      this.connected = false;
      for (const [, { reject }] of this.pending) {
        reject(new Error('MCP server process exited'));
      }
      this.pending.clear();
    });

    this.process.on('error', (err) => {
      this.connected = false;
      for (const [, { reject }] of this.pending) {
        reject(err);
      }
      this.pending.clear();
    });

    await this.initialize();
    this.connected = true;
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse;
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(`MCP error ${msg.error.code}: ${msg.error.message}`));
          } else {
            resolve(msg.result);
          }
        }
      } catch {
        // non-JSON line, ignore
      }
    }
  }

  private send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('MCP server not connected'));
        return;
      }

      const id = ++this.requestId;
      const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

      const timeout = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP request timeout: ${method}`));
        }
      }, 30000);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });

      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  private notify(method: string, params?: Record<string, unknown>): void {
    if (!this.process || !this.process.stdin) return;
    const notification: JsonRpcNotification = { jsonrpc: '2.0', method };
    if (params) notification.params = params;
    this.process.stdin.write(JSON.stringify(notification) + '\n');
  }

  private async initialize(): Promise<void> {
    await this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mempalace-explorer', version: '1.0.0' },
    });
    this.notify('notifications/initialized');
  }

  private async callTool(toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    await this.ensureConnected();
    const result = await this.send('tools/call', { name: toolName, arguments: args }) as {
      content?: Array<{ type: string; text?: string }>;
    };
    if (result?.content?.[0]?.text) {
      return JSON.parse(result.content[0].text);
    }
    return result;
  }

  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
    this.buffer = '';
    this.pending.clear();
  }

  async getTaxonomy(): Promise<RawTaxonomy> {
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

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.ensureConnected();
      const result = await this.callTool('mempalace_status') as Record<string, unknown>;
      return {
        ok: true,
        message: `Connected via MCP. ${result.total_drawers || 0} drawers in palace.`,
        provider: 'mcp',
      };
    } catch (err) {
      return {
        ok: false,
        message: `MCP connection failed: ${(err as Error).message}`,
        provider: 'mcp',
      };
    }
  }

  private parseGraphData(raw: Record<string, unknown>): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seen = new Set<string>();

    if (raw.rooms || raw.connections || raw.graph) {
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
    }

    return { nodes, edges };
  }
}
