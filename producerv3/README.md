# EPUB Editor Tool

Tiptap editor based EPUB editing tool with AI Generator integration and JSON-LD semantic nodes for story elements.

## Architecture

- **Frontend**: Next.js 14 App Router + Tiptap + JSON-LD Semantic Nodes + AI Generator + Tailwind CSS
- **Backend**: GraphQL (Poem/Rust) + PostgreSQL
- **Data Model**: OWL/SHACL + RDF (JSON-LD)
- **Editor Extensions**: Custom Tiptap nodes for JSON-LD story elements, content masking, and slash commands

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
    │   ├── projects/
    │   │   ├── page.tsx    # Project list page
    │   │   └── [projectId]/
    │   │       └── editor/ # Tiptap editor page
    │   ├── api/
    │   │   └── ai/          # AI Generator API routes (legacy, migrated to GraphQL)
    │   ├── layout.tsx       # Root layout
    │   ├── page.tsx         # Landing page (redirects to /projects/default/editor)
    │   └── globals.css      # Global styles with Tailwind
    ├── components/
    │   ├── editor/         # Editor components
    │   │   ├── TiptapEditor.tsx      # Main editor component
    │   │   ├── ChapterTree.tsx       # Chapter navigation tree
    │   │   ├── MetadataForm.tsx       # EPUB metadata editor
    │   │   ├── MediaLibrary.tsx       # Media asset management
    │   │   ├── ApolloProvider.tsx    # GraphQL provider
    │   │   ├── MaskControls.tsx      # Mask control UI
    │   │   ├── NodeSelectorDialog.tsx # Node selection dialog
    │   │   ├── SlashCommandMenu.tsx  # Slash command menu
    │   │   └── extensions/            # Tiptap custom extensions
    │   │       ├── CharacterNode.ts  # Character node extension
    │   │       ├── GhostNode.ts      # Ghost node extension
    │   │       ├── LocationNode.ts    # Location node extension
    │   │       ├── OrganizationNode.ts # Organization node extension
    │   │       ├── TechnologyNode.ts  # Technology node extension
    │   │       ├── StoryNode.ts       # Story nodes (Episode, Scene, Arc, etc.)
    │   │       ├── MetaNode.ts        # Meta nodes (SourceRef, Event, etc.)
    │   │       ├── MaskExtension.ts   # Mask extension
    │   │       └── SlashCommand.ts    # Slash command extension
    │   └── ai/             # AI Generator components (TextGenerator, Summarizer, Proofreader, Translator)
    └── lib/
        ├── graphql/        # GraphQL client, queries, and mutations
        ├── jsonld/         # JSON-LD context definitions
        └── utils/          # Utility functions (UUID normalization)
    └── types/
        └── jsonld.ts      # JSON-LD node type definitions
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
- **JSON-LD Semantic Nodes**: Insert story elements (Character, Ghost, Location, Organization, Technology, Episode, Scene, Arc, Motif, Season, Timeline, Event, SourceRef, Occupation, Setting) as structured nodes
- **Content Masking**: Visual masking of content with 10 mask types (emotion, theme, context, notes, relationship, virtue, anchoredTo, emitsRepelsAvoids, phase, role)
- **Slash Commands**: Insert nodes via slash commands (`/character`, `/location`, etc.)

## Recent Updates (v1.3.0)

### JSON-LD Semantic Nodes
- **Custom Tiptap Nodes**: Implemented 15 JSON-LD node types (Character, Ghost, Location, Organization, Technology, Episode, Scene, Arc, Motif, Season, Timeline, Event, SourceRef, Occupation, Setting)
- **Node Insertion**: Insert nodes via toolbar buttons or slash commands (`/character`, `/location`, etc.)
- **GraphQL Integration**: Fetch node data from GraphQL API for node selection
- **Node Selector Dialog**: User-friendly dialog for selecting existing nodes from database

### Content Masking
- **Mask Extension**: Visual masking of content with 10 mask types
- **Mask Controls**: UI component for toggling masks on/off
- **Mask Types**: emotion, theme, context, notes, relationship, virtue, anchoredTo, emitsRepelsAvoids, phase, role
- **CSS Styling**: Visual feedback for masked content (blur, opacity)

### Slash Commands
- **Command Interface**: Type `/` followed by node type to insert nodes
- **Suggestion Menu**: Auto-complete menu showing available node types
- **Keyboard Navigation**: Arrow keys and Enter/Tab to select commands

## Previous Updates (v1.2.0)

### Project Management
- **Project List Page**: Browse all EPUB projects at `/projects` with metadata display
- **Default Project Support**: UUID normalization for "default" project ID (maps to `00000000-0000-0000-0000-000000000000`)
- **Chapter Management**: Create, select, and edit chapters with visual feedback
- **Auto-save**: Automatic saving with 1-second debounce after last change

### HMR (Hot Module Replacement)
- **Rust**: `cargo watch` configured with optimized file watching (`--ignore target/**`, `--delay 0.5`, `--clear`)
- **Next.js**: Fast Refresh enabled with webpack polling (1000ms interval) for Docker environments
- Both services automatically reload on file changes for faster development

### GraphQL Integration
- **Field Naming**: All GraphQL fields use camelCase (matching async-graphql conventions)
- **Type Safety**: GraphQL Codegen generates TypeScript types from schema
- **Error Handling**: Improved error messages and validation

### Technical Improvements
- **TypeScript**: Fixed type errors related to `exactOptionalPropertyTypes`
- **Dependencies**: Added `@types/react`, `@types/react-dom`, `@graphql-typed-document-node/core`
- **Docker**: Optimized `.dockerignore` files for better build performance

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
