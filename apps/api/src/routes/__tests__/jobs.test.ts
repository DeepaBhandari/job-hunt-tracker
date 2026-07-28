import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const mockCompanies = new Map<string, { id: string; userId: string; name: string }>();
const mockJobs = new Map<string, {
  id: string; companyId: string; userId: string; title: string;
  description: string | null; url: string | null; salaryMin: number | null;
  salaryMax: number | null; location: string | null; type: string | null;
  source: string | null; createdAt: Date;
}>();
const state = { jobCounter: 0, userCounter: 0 };

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          for (const u of mockUsers.values()) {
            if (u.email === where.email) return u;
          }
          return null;
        }
        if (where.id) {
          return mockUsers.get(where.id) ?? null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: { email: string; passwordHash: string; name?: string } }) => {
        state.userCounter++;
        const user = {
          id: `user_${state.userCounter}`,
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name ?? null,
          googleId: null,
          createdAt: new Date(),
        };
        mockUsers.set(user.id, user);
        return user;
      }),
    },
    company: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const company = Array.from(mockCompanies.values()).find(
          (c) => c.id === where.id && c.userId === where.userId
        );
        return company ?? null;
      }),
    },
    job: {
      findMany: vi.fn(async ({ where, orderBy, include }: { where: { userId: string; companyId?: string }; orderBy?: Record<string, string>; include?: Record<string, unknown> }) => {
        let results = Array.from(mockJobs.values()).filter((j) => j.userId === where.userId);
        if (where.companyId) {
          results = results.filter((j) => j.companyId === where.companyId);
        }
        if (orderBy?.createdAt === 'desc') {
          results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (include?.company) {
          return results.map((j) => ({
            ...j,
            company: mockCompanies.get(j.companyId)
              ? { id: mockCompanies.get(j.companyId)!.id, name: mockCompanies.get(j.companyId)!.name }
              : null,
          }));
        }
        return results;
      }),
      findFirst: vi.fn(async ({ where, include }: { where: { id: string; userId: string }; include?: Record<string, unknown> }) => {
        const job = Array.from(mockJobs.values()).find(
          (j) => j.id === where.id && j.userId === where.userId
        );
        if (!job) return null;
        if (include?.company) {
          return {
            ...job,
            company: mockCompanies.get(job.companyId)
              ? { id: mockCompanies.get(job.companyId)!.id, name: mockCompanies.get(job.companyId)!.name }
              : null,
          };
        }
        return job;
      }),
      create: vi.fn(async ({ data, include }: { data: Record<string, unknown>; include?: Record<string, unknown> }) => {
        state.jobCounter++;
        const job = {
          id: `job_${state.jobCounter}`,
          companyId: data.companyId as string,
          userId: data.userId as string,
          title: data.title as string,
          description: (data.description as string) ?? null,
          url: (data.url as string) ?? null,
          salaryMin: (data.salaryMin as number) ?? null,
          salaryMax: (data.salaryMax as number) ?? null,
          location: (data.location as string) ?? null,
          type: (data.type as string) ?? null,
          source: (data.source as string) ?? null,
          createdAt: new Date(),
        };
        mockJobs.set(job.id, job);
        if (include?.company) {
          return {
            ...job,
            company: mockCompanies.get(job.companyId)
              ? { id: mockCompanies.get(job.companyId)!.id, name: mockCompanies.get(job.companyId)!.name }
              : null,
          };
        }
        return job;
      }),
      update: vi.fn(async ({ where, data, include }: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }) => {
        const existing = mockJobs.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        mockJobs.set(where.id, updated as typeof existing);
        if (include?.company) {
          return {
            ...updated,
            company: mockCompanies.get(updated.companyId)
              ? { id: mockCompanies.get(updated.companyId)!.id, name: mockCompanies.get(updated.companyId)!.name }
              : null,
          };
        }
        return updated;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        mockJobs.delete(where.id);
      }),
    },
  },
}));

function extractCookie(res: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

const app = (await import('../../app.js')).default;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});

beforeEach(() => {
  mockUsers.clear();
  mockCompanies.clear();
  mockJobs.clear();
  state.jobCounter = 0;
  state.userCounter = 0;
  vi.clearAllMocks();

  mockCompanies.set('company_1', { id: 'company_1', userId: 'user_1', name: 'Acme Corp' });
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

describe('Job CRUD', () => {
  it('POST /jobs creates a job', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'Software Engineer', type: 'FULL_TIME' });

    expect(res.status).toBe(201);
    expect(res.body.job.title).toBe('Software Engineer');
    expect(res.body.job.type).toBe('FULL_TIME');
    expect(res.body.job.company.name).toBe('Acme Corp');
  });

  it('GET /jobs lists all jobs for the user', async () => {
    const cookie = await registerAndGetCookie();

    await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'Job A' });
    await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'Job B' });

    const res = await request(app).get('/jobs').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(2);
  });

  it('GET /jobs filters by companyId', async () => {
    const cookie = await registerAndGetCookie();

    mockCompanies.set('company_2', { id: 'company_2', userId: 'user_1', name: 'Other Inc' });

    await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'Job at Acme' });
    await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_2', title: 'Job at Other' });

    const res = await request(app)
      .get('/jobs')
      .set('Cookie', cookie)
      .query({ companyId: 'company_1' });

    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].title).toBe('Job at Acme');
  });

  it('GET /jobs/:id returns a single job', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'Solo Job' });

    const id = createRes.body.job.id;

    const res = await request(app).get(`/jobs/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.job.title).toBe('Solo Job');
    expect(res.body.job).toHaveProperty('company');
  });

  it('PATCH /jobs/:id updates a job', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'Old Title' });

    const id = createRes.body.job.id;

    const res = await request(app)
      .patch(`/jobs/${id}`)
      .set('Cookie', cookie)
      .send({ title: 'New Title', location: 'Remote' });

    expect(res.status).toBe(200);
    expect(res.body.job.title).toBe('New Title');
    expect(res.body.job.location).toBe('Remote');
  });

  it('DELETE /jobs/:id removes a job', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'Delete Me' });

    const id = createRes.body.job.id;

    const res = await request(app).delete(`/jobs/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/jobs/${id}`).set('Cookie', cookie);
    expect(getRes.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/jobs');
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing title', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for nonexistent job', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app).get('/jobs/nonexistent').set('Cookie', cookie);

    expect(res.status).toBe(404);
  });

  it('returns 404 when accessing another user\'s job', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/jobs')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', title: 'My Job' });

    const id = createRes.body.job.id;

    const otherRes = await request(app)
      .post('/auth/register')
      .send({ email: 'other@example.com', password: 'password123', name: 'Other' });
    const otherCookie = extractCookie(otherRes);

    const res = await request(app).get(`/jobs/${id}`).set('Cookie', otherCookie);
    expect(res.status).toBe(404);
  });
});
