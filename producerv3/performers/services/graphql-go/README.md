# GraphQL Service (Go Implementation)

GraphQL API service for EPUB Editor Tool implemented in Go using gqlgen.

## Overview

This service provides GraphQL Query, Mutation, and Subscription operations for EPUB editing, running in parallel with the Rust implementation on port 25326.

## Technology Stack

- **GraphQL**: gqlgen v0.17.x (code generation based)
- **Database**: Neo4j Go Driver v5.x
- **HTTP Server**: net/http (standard library)
- **Language**: Go 1.22+

## Project Structure

```
graphql-go/
├── cmd/server/          # Application entry point
├── graph/               # Generated GraphQL code
│   ├── schema/         # GraphQL SDL definitions
│   └── model/          # Generated models
├── internal/
│   ├── resolver/       # GraphQL resolvers
│   ├── ports/          # External integrations (Neo4j, AI, EPUB export)
│   └── server/          # HTTP server setup
├── go.mod              # Go module definition
├── gqlgen.yml          # gqlgen configuration
└── Dockerfile          # Docker build configuration
```

## Development

### Prerequisites

- Go 1.22 or later
- Neo4j 5.15+ (running in Docker)

### Setup

1. Install dependencies:
```bash
go mod download
go mod tidy
```

2. Generate GraphQL code:
```bash
make generate
# or
go run github.com/99designs/gqlgen generate
```

3. Build the application:
```bash
make build
# or
go build -o bin/epub-editor-graphql-go ./cmd/server
```

4. Run the application:
```bash
make run
# or
./bin/epub-editor-graphql-go
```

### Environment Variables

- `NEO4J_URI`: Neo4j connection URI (default: `bolt://localhost:7687`)
- `NEO4J_USER`: Neo4j username (default: `neo4j`)
- `NEO4J_PASSWORD`: Neo4j password (default: `password`)
- `PORT`: Server port (default: `8080`)
- `HOST`: Server host (default: `0.0.0.0`)

## Docker

### Development

```bash
docker-compose up graphql-go
```

The service will run with hot reload using Air on port 25326.

### Production

```bash
docker build -t epub-editor-graphql-go --target production .
docker run -p 25326:8080 epub-editor-graphql-go
```

## GraphQL Endpoints

- **GraphQL API**: `http://localhost:25326/graphql`
- **Playground**: `http://localhost:25326/playground`

## Features

### Query Operations

- `epub(id: ID!)`: Get EPUB by ID
- `epubList`: List all EPUBs
- `chapter(id: ID!)`: Get chapter by ID
- `chapters(epubId: ID!)`: Get chapters for EPUB
- `media(id: ID!)`: Get media by ID
- `metadata(epubId: ID!)`: Get metadata for EPUB

### Mutation Operations

- `createEpub(input: CreateEpubInput!)`: Create new EPUB
- `updateEpub(input: UpdateEpubInput!)`: Update EPUB
- `deleteEpub(id: ID!)`: Delete EPUB
- `createChapter(input: CreateChapterInput!)`: Create chapter
- `updateChapter(input: UpdateChapterInput!)`: Update chapter
- `deleteChapter(id: ID!)`: Delete chapter
- `createMedia(input: CreateMediaInput!)`: Create media
- `updateMetadata(input: UpdateMetadataInput!)`: Update metadata
- `generateText(input: GenerateTextInput!)`: Generate text using AI
- `summarize(input: SummarizeInput!)`: Summarize chapter
- `proofread(input: ProofreadInput!)`: Proofread chapter
- `translate(input: TranslateInput!)`: Translate chapter

### Subscription Operations

- `_empty`: Placeholder for future subscription implementation

## Compatibility

This Go implementation maintains full compatibility with the Rust implementation:

- Same GraphQL schema
- Same endpoint structure (`/graphql`)
- Same response format
- Same environment variables

## Notes

- AI service integration is currently placeholder implementations
- EPUB export functionality is available via `ports.ExportEpub()`
- The service runs in parallel with the Rust implementation on different ports

