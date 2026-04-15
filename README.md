# MemPalace Explorer

A modern web application for visually navigating, searching, and managing [MemPalace](https://pypi.org/project/mempalace/) memories. Built with Vue 3, Tailwind CSS, Express, and Prisma.

## Features

- **Tree Navigation** -- Browse your palace hierarchy (Wing > Room > Memories) with an expandable sidebar
- **Semantic Search** -- Full-text search powered by MemPalace embeddings, triggered via `Ctrl+K` / `Cmd+K`
- **Memory Viewer** -- Read, create, edit, and delete memories with full metadata display
- **Knowledge Graph** -- Force-directed D3.js visualization of room traversals and entity relationships
- **Query Lab** -- Monaco Editor with a custom DSL, autocomplete, and sortable results table
- **Timeline** -- Chronological view of memories with type inference (decision / insight / rule) and filters
- **Favorites** -- Star memories for quick access
- **Dark Mode** -- Default dark theme inspired by Linear and Notion

## Prerequisites

| Dependency | Version |
|---|---|
| **Node.js** | >= 18 |
| **npm** | >= 9 |
| **mempalace** (Python) | `pip install mempalace` |

The `mempalace` CLI must be available on your PATH, or you can provide the full path to the binary in Settings.

## Quick Start

```bash
# 1. Install dependencies (root, client, and server)
npm install

# 2. Generate Prisma client & create the SQLite database
cd server
npx prisma generate
npx prisma db push
cd ..

# 3. Start both client and server in dev mode
npm run dev
```

The client runs on **http://localhost:5173** and the server on **http://localhost:3001**.

## First-Run Setup

On first launch the app redirects to the **Settings** page where you:

1. Choose a provider: **MCP Client** (recommended, persistent connection) or **CLI Subprocess** (one process per request).
2. Set the path to `mempalace` (e.g. `mempalace` if on PATH, or a full path like `/home/user/.local/bin/mempalace`).
3. Click **Test Connection** to verify.
4. Click **Save** -- the app loads your palace taxonomy and redirects to the Explorer.

Configuration is persisted in a local SQLite database at `server/prisma/dev.db`.

## Project Structure

```
mempalaceViewer/
├── client/                  # Vue 3 + Vite frontend
│   └── src/
│       ├── assets/styles/   # Tailwind + custom theme
│       ├── components/      # Reusable UI components
│       │   ├── graph/       #   D3 force-directed graph
│       │   ├── layout/      #   AppLayout, Topbar, Sidebar, StatusBar, Breadcrumb
│       │   ├── memory/      #   MemoryCard, MemoryDetail, MemoryEditor
│       │   ├── query/       #   Monaco QueryEditor, QueryResults table
│       │   ├── search/      #   SearchBar modal, SearchResults list
│       │   ├── settings/    #   ProviderSelector, ConnectionTester
│       │   ├── timeline/    #   TimelineItem
│       │   └── tree/        #   TreeView, TreeNode (recursive)
│       ├── composables/     # useKeyboard (global shortcuts)
│       ├── router/          # Vue Router (lazy-loaded routes)
│       ├── services/        # HTTP client (fetch wrapper)
│       ├── stores/          # Pinia stores (settings, palace, memory, search, ui)
│       ├── types/           # Shared TypeScript interfaces
│       └── views/           # Page-level components
├── server/                  # Express + Prisma backend
│   ├── prisma/              # Schema & SQLite DB
│   └── src/
│       ├── providers/       # MCP Client & CLI provider implementations
│       ├── routes/          # REST API routes
│       └── types/           # Server-side TypeScript interfaces
└── package.json             # Workspace root (npm workspaces + concurrently)
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start client + server concurrently |
| `npm run build` | Build client and server for production |
| `npm run dev:client` | Start only the Vite dev server |
| `npm run dev:server` | Start only the Express dev server |

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Open semantic search |
| `Escape` | Close search / editor / detail panel |
| `↑` / `k` | Navigate tree up |
| `↓` / `j` | Navigate tree down |
| `→` / `l` | Expand into wing (select first room) |
| `←` / `h` | Collapse back to wing |
| `Ctrl+B` / `Cmd+B` | Toggle sidebar |
| `Ctrl+Enter` | Run query (in Query Lab) |

## Tech Stack

**Frontend**: Vue 3 (Composition API + TypeScript), Pinia, Vue Router, Tailwind CSS v4, D3.js, Monaco Editor

**Backend**: Express, Prisma (SQLite), JSON-RPC 2.0 over stdio to `mempalace mcp`

## License

MIT.
