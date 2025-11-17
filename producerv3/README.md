# EPUB Editor Tool

Tiptap editor based EPUB editing tool with AI Generator integration.

## Architecture

- **Frontend**: Astro + Tiptap + AI Generator
- **Backend**: GraphQL (Poem/Rust) + Neo4j
- **Authentication**: Clerk v6.x
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
│           │   └── ports/       # Neo4j, EPUB export, AI service
│           └── neo4j-schema.cypher
└── src/                    # Astro frontend
    ├── app/
    │   ├── projects/[projectId]/
    │   │   └── editor/     # Tiptap editor page
    │   └── api/
    │       └── ai/          # AI Generator API routes
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

# Initialize Neo4j schema
make neo4j-init
```

Services will be available at:
- Frontend: http://localhost:3000
- GraphQL API: http://localhost:8080/graphql
- Neo4j Browser: http://localhost:7474

### Manual Setup

#### Frontend (Astro)

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

#### Neo4j

1. Start Neo4j database
2. Run schema initialization:
```bash
cypher-shell -u neo4j -p password < neo4j-schema.cypher
```

## Environment Variables

### Frontend (.env)

```
PUBLIC_GRAPHQL_API_URL=http://localhost:8080/graphql
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

### Backend (.env)

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
PORT=8080
```

## Features

- **EPUB Editing**: WYSIWYG editing with Tiptap editor
- **Chapter Management**: Create, update, delete, and reorder chapters
- **Metadata Editing**: Edit EPUB metadata (title, author, ISBN, etc.)
- **Media Management**: Upload and manage images and media assets
- **AI Generator**: Text generation, summarization, proofreading, and translation
- **EPUB Export**: Export edited content to EPUB 3.0 format

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
make neo4j-init   # Initialize Neo4j schema
```

## License

MIT
