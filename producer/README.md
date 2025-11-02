This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 22.x
- pnpm
- Supabase account and project

### Environment Setup

Create a `.env.local` file in the project root with the following variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Database Setup

1. Run database migrations:

```bash
pnpm db:generate  # Generate migration files
pnpm db:push      # Push schema to Supabase
```

2. Or use Drizzle Studio to manage the database:

```bash
pnpm db:studio
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database

This project uses Supabase (PostgreSQL) with Drizzle ORM for data persistence. The schema is defined in `src/infra/supabase/schema.ts`.

### Available Database Scripts

- `pnpm db:generate` - Generate migration files from schema changes
- `pnpm db:migrate` - Run migrations
- `pnpm db:push` - Push schema changes directly to database
- `pnpm db:studio` - Open Drizzle Studio for database management

## Architecture

- **Storage**: Supabase PostgreSQL via Drizzle ORM
- **API**: tRPC with Next.js App Router
- **State Management**: XState v5, Zustand
- **UI**: React Flow for canvas-based UI

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Drizzle ORM Documentation](https://orm.drizzle.team/) - learn about Drizzle ORM.
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Make sure to set the environment variables in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
