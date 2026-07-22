# Job Hunt Tracker

A full-stack multi-user web app to manage job applications. Track companies, jobs, applications, interviews, contacts, and resume versions — with AI-powered cover letter generation and analytics.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), TypeScript, shadcn/ui, Tailwind CSS |
| State | TanStack Query, Zustand |
| Backend | Node.js + Express (separate API service) |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT in httpOnly cookies |
| Validation | Zod (shared between frontend and backend) |
| AI | OpenRouter |
| File Storage | Local disk via UPLOAD_DIR |
| Testing | Vitest + Supertest |

## Features

### Authentication & Users
- Email/password registration and login
- JWT-based session management with httpOnly cookies
- Automatic token refresh

### Job Application Pipeline
- CRUD for companies, jobs, applications, contacts, and interviews
- Kanban board with drag-and-drop between pipeline stages
- Application statuses: Saved → Applied → Screening → Interview → Offer / Rejected / Withdrawn
- Interview scheduling with outcome tracking
- Contact management per company
- Resume version upload and attachment to applications

### AI-Powered Tools
- Cover letter generator (job description + resume → cover letter)
- Resume gap analyzer (job description → missing keywords/skills)
- Interview prep generator (job title + stage → 10 questions with coaching)
- Save job from URL (paste link → AI extracts job details)

### Analytics Dashboard
- Overview stats: total applications, response rate, avg days to response
- Applications over time (weekly chart)
- Stage funnel visualization
- Source breakdown with bar chart
- Salary range tracker
- Weekly digest: recent activity + upcoming interviews
- Export to CSV

### UI/UX
- Dark mode
- Command palette (cmdk)
- Mobile responsive with collapsible navigation
- Responsive padding and layouts for all screen sizes

## Repository Structure

```
job-hunt-tracker/
  apps/
    web/          ← Next.js 15 frontend (App Router)
    api/          ← Express API server
  packages/
    db/           ← Prisma schema + migrations + seed
    types/        ← Shared TypeScript types and Zod schemas
  turbo.json
  package.json
  pnpm-workspace.yaml
```

## Prerequisites

- Node.js 18 or newer
- pnpm 9 or newer
- PostgreSQL database
- OpenRouter API key (for AI features)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/jobhunt"

# Auth
JWT_SECRET="your_jwt_secret"
JWT_REFRESH_SECRET="your_refresh_secret"

# Frontend
FRONTEND_URL="http://localhost:3000"

# AI (optional, for cover letters, gap analysis, etc.)
OPENROUTER_API_KEY="your_openrouter_api_key"
OPENROUTER_MODEL="openai/gpt-4o-mini"

# File storage
UPLOAD_DIR="./uploads"
```

3. Run Prisma migrations and generate the client:

```bash
pnpm turbo run db:migrate
pnpm turbo run db:generate
```

4. Seed the database (optional):

```bash
pnpm --filter @job-hunt/db run db:seed
```

5. Start development servers:

```bash
pnpm turbo dev
```

The frontend runs on `http://localhost:3000` and the API on `http://localhost:3001`.

## Commands

### Root

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run lint across workspace |
| `pnpm type-check` | Run type checking across workspace |

### Frontend (`apps/web`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build Next.js app |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Type-check frontend code |

### API (`apps/api`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API server with tsx watch |
| `pnpm build` | Compile API to dist |
| `pnpm type-check` | Type-check API code |
| `pnpm test` | Run Vitest unit tests |

### Database (`packages/db`)

| Command | Description |
|---------|-------------|
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:studio` | Launch Prisma Studio |
| `pnpm db:seed` | Run seed script |

## Testing

The API includes integration tests using Vitest and Supertest:

```bash
cd apps/api && pnpm test
```

Tests cover:
- Health endpoint
- Auth routes (register, login, logout, me)
- Company CRUD operations

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |
| CRUD | `/companies` | Company management |
| CRUD | `/jobs` | Job postings |
| CRUD | `/applications` | Applications |
| CRUD | `/interviews` | Interview scheduling |
| CRUD | `/contacts` | Contact management |
| CRUD | `/resume-versions` | Resume versions |
| POST | `/resume-upload` | Upload resume file |
| POST | `/ai/*` | AI-powered features |
| GET | `/stats/*` | Analytics endpoints |

## Database Schema

The Prisma schema defines: `User`, `Company`, `Job`, `Application`, `Interview`, `Contact`, `ResumeVersion`, `Tag`, and `ApplicationTag`.

## Deployment

- **Frontend** → Vercel (auto-deploy on push to main)
- **API + PostgreSQL** → Railway (auto-deploy on push to main)
- Environment variables managed via Vercel/Railway dashboards

## License

MIT
