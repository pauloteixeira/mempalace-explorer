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
  KGTriple,
  ConnectionTestResult,
} from '../types';

export interface MemPalaceProvider {
  /** Full taxonomy: wing -> room -> drawer count */
  getTaxonomy(): Promise<RawTaxonomy>;

  /** List all wings with room names and drawer counts */
  listWings(): Promise<Wing[]>;

  /** List rooms, optionally filtered by wing */
  listRooms(wing?: string): Promise<Room[]>;

  /** List drawers with pagination and optional wing/room filter */
  listDrawers(
    wing?: string,
    room?: string,
    limit?: number,
    offset?: number,
  ): Promise<DrawerListResponse>;

  /** Get a single drawer by ID with full content */
  getDrawer(id: string): Promise<Drawer>;

  /** Add a new drawer */
  addDrawer(input: CreateDrawerInput): Promise<Drawer>;

  /** Update an existing drawer */
  updateDrawer(id: string, updates: UpdateDrawerInput): Promise<Drawer>;

  /** Delete a drawer (irreversible) */
  deleteDrawer(id: string): Promise<void>;

  /** Semantic search across memories */
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;

  /** Walk the palace graph from a room */
  traverse(startRoom: string, maxHops?: number): Promise<GraphData>;

  /** Query knowledge graph for an entity's relationships */
  kgQuery(entity: string, direction?: string, asOf?: string): Promise<KGTriple[]>;

  /** Verify the connection to MemPalace is working */
  testConnection(): Promise<ConnectionTestResult>;
}
