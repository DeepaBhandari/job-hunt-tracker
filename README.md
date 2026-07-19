# Job Hunt Tracker

A monorepo for a job application tracker built with Next.js, Express, Prisma, and a shared TypeScript workspace. The project includes a web frontend, API backend, database package, and shared type definitions.

## Repository structure

- `apps/web` - Next.js frontend application.
- `apps/api` - Express API server with authentication, job/application management, resume upload, and AI routes.
- `packages/db` - Prisma database package and schema for users, companies, jobs, applications, interviews, contacts, resumes, and tags.
- `packages/types` - Shared TypeScript types and Zod schemas used across the monorepo.

## Key features

- User authentication and session handling
- CRUD routes for companies, jobs, applications, contacts, interviews, and resume versions
- Resume upload support and S3 integration
- AI-related API endpoints
- Kanban-style application tracking UI
- Shared Prisma schema and generated client via `packages/db`

## Prerequisites

- Node.js 18 or newer
- pnpm 9 or newer
- PostgreSQL database
- AWS S3-compatible storage for resume uploads (optional)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create environment variables for the API and database.

Example `.env` values (adapt for your environment):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/jobhunt"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your_jwt_secret"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
S3_BUCKET_NAME="your_bucket_name"
```

3. Run Prisma migrations and generate the client:

```bash
pnpm turbo run db:migrate
pnpm turbo run db:generate
```

4. Seed the database if needed:

```bash
pnpm --filter @job-hunt/db run db:seed
```

## Development

Run the full monorepo in development mode:

```bash
pnpm turbo dev
```

This starts both the frontend and backend with Turbo's pipeline.

## Package commands

### Root commands

- `pnpm dev` - start all apps in development
- `pnpm build` - build all packages
- `pnpm lint` - run lint across workspace
- `pnpm type-check` - run type checking across workspace

### Frontend

From `apps/web`:

- `pnpm dev` - start Next.js dev server
- `pnpm build` - build Next.js app
- `pnpm start` - run built app
- `pnpm lint` - run ESLint

### API

From `apps/api`:

- `pnpm dev` - start API server with `tsx watch`
- `pnpm build` - compile API to `dist`
- `pnpm start` - run built API server
- `pnpm type-check` - type-check API code

### Database

From `packages/db`:

- `pnpm db:migrate` - apply Prisma migrations
- `pnpm db:generate` - generate Prisma client
- `pnpm db:studio` - launch Prisma Studio
- `pnpm db:seed` - run seed script

## Environment

The API is configured to allow requests from `FRONTEND_URL`, defaulting to `http://localhost:3000`.

The API server listens on port `3001` by default.

## Database schema overview

The Prisma schema defines:

- `User`
- `Company`
- `Job`
- `Application`
- `Interview`
- `Contact`
- `ResumeVersion`
- `Tag`
- `ApplicationTag`

Application statuses include: `SAVED`, `APPLIED`, `SCREENING`, `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`.

## Notes

- This project uses Turbo for monorepo orchestration and pnpm workspace packages.
- Shared types are imported from `@job-hunt/types`.
- Database code is provided by `@job-hunt/db` and consumed by the API.

## Testing

From `apps/api`:

- `pnpm test` - run the Vitest unit test suite

## Screenshots

_Coming soon — dashboard, kanban board, and analytics views._

## Demo

_A short walkthrough video will be linked here once recorded._

## Helpful commands

```bash
pnpm install
pnpm turbo dev
pnpm turbo run build
pnpm turbo run type-check
```
