# EPUB Editor Tool

Tiptap editor based EPUB editing tool with AI Generator integration.

## Architecture

- **Frontend**: Next.js 14 App Router + Tiptap + AI Generator + Tailwind CSS
- **Backend**: GraphQL (Poem/Rust) + PostgreSQL
- **Data Model**: OWL/SHACL + RDF (JSON-LD)

## Project Structure

```
.
├── PROJECT.jsonld          # Project definition (OWL Merkle DAG)
├── GOAL.jsonld             # Project goals
├── capabilities.jsonld     # Capability definitions
├── activities.jsonld       # Activity definitions
├── schemas/
│   └── epub-ontology.jsonld  # EPUB OWL/SHACL definitions
├── performers/
│   └── services/
│       └── graphql/        # Rust GraphQL service
│           ├── Cargo.toml
│           ├── src/
│           │   ├── main.rs
│           │   ├── schema/     # GraphQL schema definitions
│           │   ├── resolvers/   # Query/Mutation resolvers
│           │   └── ports/       # PostgreSQL, EPUB export, AI service
└── src/                    # Next.js frontend
    ├── app/
    │   ├── projects/[projectId]/
    │   │   └── editor/     # Tiptap editor page
    │   ├── api/
    │   │   └── ai/          # AI Generator API routes
    │   ├── layout.tsx       # Root layout
    │   ├── page.tsx         # Landing page
    │   └── globals.css      # Global styles with Tailwind
    ├── components/
    │   ├── editor/         # Editor components
    │   └── ai/             # AI Generator components
    └── lib/
        └── graphql/        # GraphQL client and queries
```

## Setup

### Docker Compose (Recommended)

```bash
# Start all services
make dev

# Or manually:
docker-compose up -d


Services will be available at:
- Frontend: http://localhost:25320
- Projects List: http://localhost:25320/projects
- Editor: http://localhost:25320/projects/default/editor
- GraphQL API: http://localhost:25325/graphql
- PostgreSQL: localhost:5433

### Manual Setup

#### Frontend (Next.js)

```bash
pnpm install
pnpm dev
```

#### Backend (Rust GraphQL)

```bash
cd performers/services/graphql
cargo build
cargo run
```


## Environment Variables

### Frontend (.env)

```
NEXT_PUBLIC_GRAPHQL_API_URL=http://localhost:25325/graphql
```

### Backend (.env)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
PORT=8080
```

## Features

- **EPUB Editing**: WYSIWYG editing with Tiptap editor
- **Chapter Management**: Create, update, delete, and reorder chapters
- **Auto-save**: Automatic saving with debounce (1 second after last change)
- **Project List**: Browse and manage all EPUB projects
- **Metadata Editing**: Edit EPUB metadata (title, author, ISBN, etc.)
- **Media Management**: Upload and manage images and media assets
- **AI Generator**: Text generation, summarization, proofreading, and translation
- **EPUB Export**: Export edited content to EPUB 3.0 format
- **Hot Module Replacement (HMR)**: Both Rust and Next.js support HMR in Docker for faster development

## Recent Updates

### HMR (Hot Module Replacement)
- **Rust**: `cargo watch` configured with optimized file watching
- **Next.js**: Fast Refresh enabled with webpack polling for Docker environments
- Both services automatically reload on file changes

### Project Management
- Project list page at `/projects`
- Default project support with UUID normalization
- Chapter selection and auto-save functionality

### GraphQL Field Naming
- All GraphQL fields use camelCase (matching async-graphql conventions)
- Automatic UUID normalization for "default" project ID

## Development

### GraphQL Codegen

Generate TypeScript types from GraphQL schema:

```bash
pnpm codegen
pnpm codegen:watch  # Watch mode
```

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
pnpm lint:fix
```

## Docker Commands

```bash
make dev          # Start development environment
make build        # Build all Docker images
make up           # Start services
make down         # Stop services
make logs         # Show logs from all services
make clean        # Remove containers, volumes, and images
```

## License

MIT
