// --- Palace hierarchy ---

export interface Wing {
  name: string;
  rooms: string[];
  drawerCount: number;
}

export interface Room {
  name: string;
  wing: string;
  drawerCount: number;
}

export interface TaxonomyNode {
  name: string;
  type: 'wing' | 'room';
  drawerCount: number;
  children?: TaxonomyNode[];
}

export type TaxonomyTree = TaxonomyNode[];

/** Raw taxonomy from MCP: { wingName: { roomName: drawerCount } } */
export type RawTaxonomy = Record<string, Record<string, number>>;

// --- Drawer (memory) ---

export interface DrawerMetadata {
  added_by?: string;
  source_file?: string;
  chunk_index?: number;
  filed_at?: string;
  [key: string]: unknown;
}

export interface Drawer {
  drawer_id: string;
  wing: string;
  room: string;
  content: string;
  content_preview?: string;
  metadata?: DrawerMetadata;
}

export interface DrawerListResponse {
  drawers: Drawer[];
  count: number;
  offset: number;
  limit: number;
}

export interface CreateDrawerInput {
  wing: string;
  room: string;
  content: string;
  source_file?: string;
  added_by?: string;
}

export interface UpdateDrawerInput {
  content?: string;
  wing?: string;
  room?: string;
}

// --- Search ---

export interface SearchOptions {
  limit?: number;
  wing?: string;
  room?: string;
  max_distance?: number;
}

export interface SearchResult {
  text: string;
  wing: string;
  room: string;
  source_file?: string;
  similarity: number;
  distance: number;
  drawer_id?: string;
}

export interface SearchResponse {
  query: string;
  filters: { wing: string | null; room: string | null };
  total_before_filter: number;
  results: SearchResult[];
}

// --- Knowledge Graph ---

export interface KGTriple {
  subject: string;
  predicate: string;
  object: string;
  valid_from?: string;
  valid_until?: string;
  source_closet?: string;
}

export interface KGAddInput {
  subject: string;
  predicate: string;
  object: string;
  valid_from?: string;
  source_closet?: string;
}

// --- Graph (traverse) ---

export interface GraphNode {
  id: string;
  label: string;
  wing: string;
  room: string;
  type: 'room' | 'drawer';
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// --- Timeline ---

export interface TimelineEntry {
  drawer_id: string;
  title: string;
  content_preview: string;
  wing: string;
  room: string;
  date: string;
  type?: 'decision' | 'insight' | 'rule' | 'general';
  tags?: string[];
}

// --- Settings ---

export type ProviderType = 'mcp' | 'cli';

export interface AppSettings {
  provider: ProviderType;
  mcp_command: string;
  mcp_args: string;
  cli_command: string;
  cli_args: string;
  configured: boolean;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  provider: ProviderType;
}

// --- Query Lab ---

export interface QueryLabRequest {
  query: string;
}

export interface QueryLabResult {
  drawer_id: string;
  title: string;
  wing: string;
  room: string;
  date?: string;
  tags?: string[];
  content_preview: string;
}
