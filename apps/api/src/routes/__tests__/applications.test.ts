import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const mockCompanies = new Map<string, { id: string; userId: string; name: string }>();
const mockJobs = new Map<string, {
  id: string; companyId: string; userId: string; title: string;
  location: string | null; salaryMin: number | null; salaryMax: number | null;
}>();
const mockApplications = new Map<string, {
  id: string; jobId: string; userId: string; status: string;
  appliedAt: Date | null; resumeVersionId: string | null;
  coverLetter: string | null; notes: string | null; createdAt: Date;
}>();
const state = { applicationCounter: 0, userCounter: 0 };

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
    job: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const job = Array.from(mockJobs.values()).find(
          (j) => j.id === where.id && j.userId === where.userId
        );
        return job ?? null;
      }),
    },
    application: {
      findMany: vi.fn(async ({ where }: { where: { userId: string; status?: string } }) => {
        let results = Array.from(mockApplications.values()).filter((a) => a.userId === where.userId);
        if (where.status) {
          results = results.filter((a) => a.status === where.status);
        }
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return results.map((a) => withInclude(a));
      }),
      findFirst: vi.fn(async ({ where }: { where: { id?: string; jobId?: string; userId: string } }) => {
        const application = Array.from(mockApplications.values()).find((a) => {
          if (where.jobId && a.jobId === where.jobId && a.userId === where.userId) return true;
          if (where.id && a.id === where.id && a.userId === where.userId) return true;
          return false;
        });
        if (!application) return null;
        return withInclude(application);
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.applicationCounter++;
        const application = {
          id: `application_${state.applicationCounter}`,
          jobId: data.jobId as string,
          userId: data.userId as string,
          status: (data.status as string) ?? 'SAVED',
          appliedAt: (data.appliedAt as Date) ?? null,
          resumeVersionId: (data.resumeVersionId as string) ?? null,
          coverLetter: (data.coverLetter as string) ?? null,
          notes: (data.notes as string) ?? null,
          createdAt: new Date(),
        };
        mockApplications.set(application.id, application);
        return withInclude(application);
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = mockApplications.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        mockApplications.set(where.id, updated as typeof existing);
        return withInclude(updated);
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        mockApplications.delete(where.id);
      }),
    },
  },
}));

function withInclude(application: {
  id: string; jobId: string; userId: string; status: string;
  appliedAt: Date | null; resumeVersionId: string | null;
  coverLetter: string | null; notes: string | null; createdAt: Date;
}) {
  const job = mockJobs.get(application.jobId);
  const company = job ? mockCompanies.get(job.companyId) : undefined;
  return {
    ...application,
    job: job && company
      ? {
          id: job.id,
          title: job.title,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          company: { id: company.id, name: company.name },
        }
      : null,
    resumeVersion: null,
    interviews: [],
    tags: [],
  };
}

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
  mockApplications.clear();
  state.applicationCounter = 0;
  state.userCounter = 0;
  vi.clearAllMocks();

  mockCompanies.set('company_1', { id: 'company_1', userId: 'user_1', name: 'Acme Corp' });
  mockJobs.set('cjob_0001', {
    id: 'cjob_0001',
    companyId: 'company_1',
    userId: 'user_1',
    title: 'Software Engineer',
    location: 'Remote',
    salaryMin: 100000,
    salaryMax: 150000,
  });
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

describe('Application CRUD', () => {
  it('POST /applications creates an application with default status', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001' });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('SAVED');
    expect(res.body.application.job.title).toBe('Software Engineer');
    expect(res.body.application.job.company.name).toBe('Acme Corp');
  });

  it('POST /applications respects an explicit status', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001', status: 'APPLIED', notes: 'Sent resume' });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('APPLIED');
    expect(res.body.application.notes).toBe('Sent resume');
  });

  it('GET /applications lists all applications for the user', async () => {
    const cookie = await registerAndGetCookie();

    mockJobs.set('cjob_0002', {
      id: 'cjob_0002',
      companyId: 'company_1',
      userId: 'user_1',
      title: 'Product Manager',
      location: null,
      salaryMin: null,
      salaryMax: null,
    });

    await request(app).post('/applications').set('Cookie', cookie).send({ jobId: 'cjob_0001' });
    await request(app).post('/applications').set('Cookie', cookie).send({ jobId: 'cjob_0002' });

    const res = await request(app).get('/applications').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(2);
  });

  it('GET /applications filters by status', async () => {
    const cookie = await registerAndGetCookie();

    mockJobs.set('cjob_0002', {
      id: 'cjob_0002',
      companyId: 'company_1',
      userId: 'user_1',
      title: 'Product Manager',
      location: null,
      salaryMin: null,
      salaryMax: null,
    });

    await request(app).post('/applications').set('Cookie', cookie).send({ jobId: 'cjob_0001' });
    await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0002', status: 'INTERVIEW' });

    const res = await request(app)
      .get('/applications')
      .set('Cookie', cookie)
      .query({ status: 'INTERVIEW' });

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].status).toBe('INTERVIEW');
  });

  it('GET /applications/:id returns a single application', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001' });

    const id = createRes.body.application.id;

    const res = await request(app).get(`/applications/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('SAVED');
    expect(res.body.application.job.company.name).toBe('Acme Corp');
  });

  it('PATCH /applications/:id updates an application', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001', status: 'SAVED' });

    const id = createRes.body.application.id;

    const res = await request(app)
      .patch(`/applications/${id}`)
      .set('Cookie', cookie)
      .send({ status: 'OFFER', notes: 'Negotiating' });

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('OFFER');
    expect(res.body.application.notes).toBe('Negotiating');
  });

  it('DELETE /applications/:id removes an application', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001' });

    const id = createRes.body.application.id;

    const res = await request(app).delete(`/applications/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/applications/${id}`).set('Cookie', cookie);
    expect(getRes.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/applications');
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing jobId', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ status: 'SAVED' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a job the user does not own', async () => {
    const cookie = await registerAndGetCookie();

    mockJobs.set('cjob_0002', {
      id: 'cjob_0002',
      companyId: 'company_1',
      userId: 'user_2',
      title: 'Not Mine',
      location: null,
      salaryMin: null,
      salaryMax: null,
    });

    const res = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0002' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/job not found/i);
  });

  it('returns 400 when an application already exists for the job', async () => {
    const cookie = await registerAndGetCookie();

    await request(app).post('/applications').set('Cookie', cookie).send({ jobId: 'cjob_0001' });

    const res = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("returns 404 when accessing another user's application", async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/applications')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001' });

    const id = createRes.body.application.id;

    const otherRes = await request(app)
      .post('/auth/register')
      .send({ email: 'other@example.com', password: 'password123', name: 'Other' });
    const otherCookie = extractCookie(otherRes);

    const res = await request(app).get(`/applications/${id}`).set('Cookie', otherCookie);
    expect(res.status).toBe(404);
  });
});
