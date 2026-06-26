# Job Hunt Tracker — Project Plan

## What It Is
A full-stack multi-user web app to manage job applications. Anyone can sign up and track their own job search pipeline — companies, jobs, applications, interviews, contacts, and resume versions — with AI-powered cover letter generation and analytics.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), TypeScript, shadcn/ui, Tailwind CSS |
| State | TanStack Query, Zustand |
| Backend | Node.js + Express (separate API service) |
| Database | PostgreSQL + Prisma ORM |
| Auth | Better Auth (JWT in httpOnly cookies, Google OAuth) |
| Validation | Zod (shared between frontend and backend) |
| AI | Claude API (claude-sonnet-4-6) |
| File Storage | AWS S3 (presigned URLs for resume uploads) |
| Deployment | Vercel (frontend) + Railway (API + PostgreSQL) |

---

## Monorepo Structure

```
job-hunt-tracker/
  apps/
    web/          ← Next.js frontend
    api/          ← Express backend
  packages/
    db/           ← Prisma schema + migrations + seed
    types/        ← Shared TypeScript types and Zod schemas
  turbo.json
  package.json
  pnpm-workspace.yaml
```

---

## Database Schema

```
User           (id, email, password_hash, name, google_id, created_at)
Company        (id, user_id, name, website, industry, size, notes)
Job            (id, company_id, user_id, title, description, url, salary_min, salary_max, location, type, source)
Application    (id, job_id, user_id, status, applied_at, resume_version_id, cover_letter, notes)
  status: SAVED | APPLIED | SCREENING | INTERVIEW | OFFER | REJECTED | WITHDRAWN
Interview      (id, application_id, scheduled_at, type, interviewer_name, notes, outcome)
  type: PHONE | VIDEO | TECHNICAL | ONSITE | HR
Contact        (id, company_id, user_id, name, role, email, linkedin_url, notes)
ResumeVersion  (id, user_id, label, s3_key, uploaded_at)
Tag            (id, user_id, name, color)
ApplicationTag (application_id, tag_id)
```

---

## Feature Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Monorepo scaffold: Turborepo + pnpm workspaces + shared ESLint/Prettier
- [ ] Prisma schema + first migration (User, Company, Job)
- [ ] Express API boilerplate: error middleware, Zod validation, health endpoint
- [ ] Auth: register, login, logout, refresh token (JWT in httpOnly cookie)
- [ ] Google OAuth
- [ ] Next.js auth pages + protected route middleware
- [ ] Company CRUD (API + frontend)
- [ ] Job CRUD (API + frontend)

### Phase 2 — Core Tracking (Week 3–4)
- [ ] Application CRUD + status field
- [ ] Kanban board — drag-and-drop between stages (react-beautiful-dnd)
- [ ] Application detail page: status timeline, notes
- [ ] Interview scheduling: create, edit, mark outcome
- [ ] Contact tracker per company
- [ ] Resume version upload via S3 presigned URLs
- [ ] Attach resume version when applying

### Phase 3 — AI Features (Week 5–6)
- [ ] Claude API integration in Express (server-side only)
- [ ] Cover letter generator (job description + resume → cover letter)
- [ ] Resume gap analyzer (job description → missing keywords/skills)
- [ ] Interview prep generator (job title + stage → 10 questions with coaching)
- [ ] Save job from URL (paste link → Claude extracts job details)

### Phase 4 — Analytics Dashboard (Week 7–8)
- [ ] Stats API: total apps, response rate, avg days to response, active count
- [ ] Recharts dashboard: applications over time, stage funnel, source breakdown
- [ ] Weekly digest view: this week's activity + upcoming interviews
- [ ] Salary range tracker across applications
- [ ] Export to CSV

### Phase 5 — Polish & Ongoing Streak
- [ ] Dark mode
- [ ] Email notifications for upcoming interviews (Resend)
- [ ] Real-time alerts with Socket.io
- [ ] Command palette (cmdk)
- [ ] Mobile responsive audit
- [ ] Unit tests: Vitest + Supertest
- [ ] E2E tests: Playwright
- [ ] README + screenshots + demo video

---

## Daily Commit Strategy

Break every feature into atomic commits:
```
schema: add Interview model
api: POST /interviews with Zod validation
feat: interview form component
feat: connect interview list to TanStack Query
fix: empty state on kanban column
chore: seed script with sample data
```

On low-time days: fix a UI bug, add a loading skeleton, improve error messages, update docs.

---

## Deployment

- Frontend → Vercel (auto-deploy on push to main)
- API + PostgreSQL → Railway (auto-deploy on push to main)
- Environment variables managed via Vercel/Railway dashboards

---

## What This Teaches (CV Additions)

- Relational schema design with PostgreSQL
- REST API design from scratch (Express + Prisma + Zod)
- Auth from scratch (JWT, refresh tokens, httpOnly cookies, Google OAuth)
- File uploads via S3 presigned URLs
- AI integration (Claude API)
- Monorepo management (Turborepo)
- Full production deployment
