# GraphQL Go Service

Go implementation of the GraphQL API for Storyboard Editor Tool.

## Technologies

- **Go 1.22+**
- **graphql-go/graphql** - GraphQL implementation
- **pgx/v5** - PostgreSQL driver
- **Atlas** - Database schema migrations
- **sqlc** - Type-safe SQL query generation

## Project Structure

```
.
├── cmd/server/main.go          # Application entry point
├── internal/
│   ├── auth/clerk.go           # Clerk authentication
│   ├── db/
│   │   ├── postgres.go         # Database connection pool
│   │   └── sqlc/               # Generated sqlc code
│   ├── graph/
│   │   ├── schema.go           # GraphQL type definitions
│   │   ├── resolver.go         # Root resolver
│   │   ├── query.go            # Query resolvers
│   │   └── mutation.go         # Mutation resolvers
│   └── services/               # External service clients
│       ├── hume.go             # Hume AI voice synthesis
│       ├── openai.go           # OpenAI image generation
│       └── suno.go             # Suno AI music generation
├── migrations/                 # Atlas SQL migrations
├── queries/                    # sqlc SQL queries
├── atlas.hcl                   # Atlas configuration
├── sqlc.yaml                   # sqlc configuration
├── Dockerfile
└── go.mod
```

## Development

### Prerequisites

- Go 1.22+
- PostgreSQL 15+
- sqlc (`brew install sqlc`)
- Atlas CLI (`brew install ariga/tap/atlas`)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   go mod download
   ```

3. Set environment variables:
   ```bash
   export DATABASE_URL="postgres://postgres:postgres@localhost:5432/storyboard?sslmode=disable"
   export HUME_API_KEY="your-hume-api-key"
   export OPENAI_API_KEY="your-openai-api-key"
   export SUNO_API_KEY="your-suno-api-key"
   ```

4. Run migrations:
   ```bash
   atlas migrate apply --env local
   ```

5. Generate sqlc code (if modifying queries):
   ```bash
   sqlc generate
   ```

6. Run the server:
   ```bash
   go run ./cmd/server
   ```

### Building

```bash
go build -o graphql-server ./cmd/server
```

### Docker

Build:
```bash
docker build -t graphql-go .
```

Run:
```bash
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://..." \
  -e HUME_API_KEY="..." \
  -e OPENAI_API_KEY="..." \
  graphql-go
```

## API

### GraphQL Endpoint

- URL: `http://localhost:8080/graphql`
- Method: `POST`
- GraphiQL: Available at the same URL in browser

### Health Check

- URL: `http://localhost:8080/health`
- Method: `GET`

### Authentication

The service expects Clerk authentication headers:
- `Authorization: Bearer <session_token>`
- `X-Org-Id: <organization_id>`
- `X-User-Id: <user_id>` (for testing)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 8080) | No |
| `HOST` | Server host (default: 0.0.0.0) | No |
| `HUME_API_KEY` | Hume AI API key | For voice features |
| `OPENAI_API_KEY` | OpenAI API key | For image generation |
| `SUNO_API_KEY` | Suno AI API key | For music generation |
