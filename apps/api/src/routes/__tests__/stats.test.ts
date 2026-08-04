import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const mockCompanies = new Map<string, { id: string; userId: string; name: string }>();
const mockJobs = new Map<string, {
  id: string; companyId: string; userId: string; title: string;
  location: string | null; salaryMin: number | null; salaryMax: number | null;
  source: string | null;
}>();
const mockApplications = new Map<string, {
  id: string; jobId: string; userId: string; status: string;
  appliedAt: Date | null; resumeVersionId: string | null;
  coverLetter: string | null; notes: string | null;
  createdAt: Date; updatedAt: Date;
}>();
const mockInterviews = new Map<string, {
  id: string; applicationId: string; scheduledAt: Date; type: string;
  interviewerName: string | null; notes: string | null; outcome: string | null;
}>();
const state = { userCounter: 0, companyCounter: 0, jobCounter: 0, applicationCounter: 0, interviewCounter: 0 };

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
    application: {
      count: vi.fn(async ({ where }: { where: { userId: string; status?: any; createdAt?: { gte: Date }; updatedAt?: { gte: Date } } }) => {
        let results = Array.from(mockApplications.values()).filter((a) => a.userId === where.userId);
        if (where.status) {
          const s = where.status;
          if (s.notIn) results = results.filter((a) => !s.notIn.includes(a.status));
          else if (s.not) results = results.filter((a) => a.status !== s.not);
          else if (s.in) results = results.filter((a) => s.in.includes(a.status));
          else results = results.filter((a) => a.status === s);
        }
        if (where.createdAt?.gte) results = results.filter((a) => a.createdAt >= where.createdAt.gte);
        if (where.updatedAt?.gte) results = results.filter((a) => a.updatedAt >= where.updatedAt.gte);
        return results.length;
      }),
      findMany: vi.fn(async ({ where, orderBy }: { where: { userId: string; status?: any; appliedAt?: { not: null }; createdAt?: { gte: Date }; updatedAt?: { gte: Date } }; orderBy?: Record<string, string> }) => {
        let results = Array.from(mockApplications.values()).filter((a) => a.userId === where.userId);
        if (where.status) {
          const s = where.status;
          if (s.in) results = results.filter((a) => s.in.includes(a.status));
          else if (s.notIn) results = results.filter((a) => !s.notIn.includes(a.status));
          else if (s.not) results = results.filter((a) => a.status !== s.not);
          else results = results.filter((a) => a.status === s);
        }
        if (where.appliedAt?.not) results = results.filter((a) => a.appliedAt != null);
        if (where.createdAt?.gte) results = results.filter((a) => a.createdAt >= where.createdAt.gte);
        if (where.updatedAt?.gte) results = results.filter((a) => a.updatedAt >= where.updatedAt.gte);
        if (orderBy?.updatedAt === 'desc') {
          results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        }
        return results.map((a) => withInclude(a));
      }),
      groupBy: vi.fn(async ({ where }: { where: { userId: string } }) => {
        const counts = new Map<string, number>();
        for (const a of mockApplications.values()) {
          if (a.userId !== where.userId) continue;
          counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
        }
        return Array.from(counts.entries()).map(([status, count]) => ({
          status,
          _count: { _all: count },
        }));
      }),
    },
    interview: {
      count: vi.fn(async ({ where }: { where: { scheduledAt?: { gte: Date }; application?: { userId: string } } }) => {
        let count = 0;
        for (const i of mockInterviews.values()) {
          const application = mockApplications.get(i.applicationId);
          if (where.application?.userId && application?.userId !== where.application.userId) continue;
          if (where.scheduledAt?.gte && i.scheduledAt < where.scheduledAt.gte) continue;
          count++;
        }
        return count;
      }),
      findMany: vi.fn(async ({ where, orderBy }: { where: { scheduledAt?: { gte: Date; lte: Date }; application?: { userId: string } }; orderBy?: { scheduledAt: 'asc' } }) => {
        let results = Array.from(mockInterviews.values());
        if (where.scheduledAt?.gte) results = results.filter((i) => i.scheduledAt >= where.scheduledAt.gte);
        if (where.scheduledAt?.lte) results = results.filter((i) => i.scheduledAt <= where.scheduledAt.lte);
        if (where.application?.userId) {
          results = results.filter((i) => mockApplications.get(i.applicationId)?.userId === where.application?.userId);
        }
        if (orderBy?.scheduledAt === 'asc') {
          results.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
        }
        return results.map((i) => ({
          ...i,
          application: withInclude(mockApplications.get(i.applicationId)!),
        }));
      }),
    },
  },
}));

function withInclude(application: {
  id: string; jobId: string; userId: string; status: string;
  appliedAt: Date | null; resumeVersionId: string | null;
  coverLetter: string | null; notes: string | null;
  createdAt: Date; updatedAt: Date;
}) {
  const job = mockJobs.get(application.jobId);
  const company = job ? mockCompanies.get(job.companyId) : undefined;
  return {
    ...application,
    job: job && company
      ? {
          ...job,
          company: { id: company.id, name: company.name },
        }
      : null,
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
  mockInterviews.clear();
  state.userCounter = 0;
  state.companyCounter = 0;
  state.jobCounter = 0;
  state.applicationCounter = 0;
  state.interviewCounter = 0;
  vi.clearAllMocks();
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

function seedApplication(overrides: Partial<{
  userId: string; status: string; appliedAt: Date | null;
  salaryMin: number | null; salaryMax: number | null; source: string | null;
  companyName: string; createdAt: Date; updatedAt: Date;
}>) {
  state.companyCounter++;
  const companyId = `company_${state.companyCounter}`;
  const company = {
    id: companyId,
    userId: overrides.userId ?? 'user_1',
    name: overrides.companyName ?? 'Acme',
  };
  mockCompanies.set(companyId, company);

  state.jobCounter++;
  const jobId = `job_${state.jobCounter}`;
  const job = {
    id: jobId,
    companyId,
    userId: overrides.userId ?? 'user_1',
    title: 'Software Engineer',
    location: null,
    salaryMin: overrides.salaryMin ?? null,
    salaryMax: overrides.salaryMax ?? null,
    source: overrides.source ?? null,
  };
  mockJobs.set(jobId, job);

  state.applicationCounter++;
  const now = new Date();
  const application = {
    id: `application_${state.applicationCounter}`,
    jobId,
    userId: overrides.userId ?? 'user_1',
    status: overrides.status ?? 'SAVED',
    appliedAt: overrides.appliedAt ?? null,
    resumeVersionId: null,
    coverLetter: null,
    notes: null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
  mockApplications.set(application.id, application);
  return application;
}

function seedInterview(applicationId: string, scheduledAt: Date) {
  state.interviewCounter++;
  const interview = {
    id: `interview_${state.interviewCounter}`,
    applicationId,
    scheduledAt,
    type: 'PHONE',
    interviewerName: null,
    notes: null,
    outcome: null,
  };
  mockInterviews.set(interview.id, interview);
  return interview;
}

describe('GET /stats/overview', () => {
  it('returns aggregate metrics', async () => {
    const cookie = await registerAndGetCookie();

    const appliedAt = new Date();
    const updatedAt = new Date(appliedAt.getTime() + 2 * 86_400_000);

    seedApplication({ status: 'SAVED' });
    seedApplication({ status: 'APPLIED', appliedAt });
    seedApplication({ status: 'OFFER', appliedAt, updatedAt });

    const res = await request(app).get('/stats/overview').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.totalApplications).toBe(3);
    expect(res.body.activeApplications).toBe(3);
    expect(res.body.offers).toBe(1);
    expect(res.body.responseRate).toBe(0.5);
    expect(res.body.avgDaysToResponse).toBe(2);
  });

  it('returns null avgDaysToResponse when nothing has responded', async () => {
    const cookie = await registerAndGetCookie();

    seedApplication({ status: 'SAVED' });

    const res = await request(app).get('/stats/overview').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.avgDaysToResponse).toBeNull();
  });
});

describe('GET /stats/timeline', () => {
  it('buckets applications by week', async () => {
    const cookie = await registerAndGetCookie();

    seedApplication({ status: 'APPLIED', createdAt: new Date() });

    const res = await request(app).get('/stats/timeline').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.weeks).toHaveLength(12);
    expect(res.body.weeks.reduce((sum: number, w: { count: number }) => sum + w.count, 0)).toBe(1);
  });

  it('respects the weeks query parameter', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app).get('/stats/timeline?weeks=4').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.weeks).toHaveLength(4);
  });
});

describe('GET /stats/funnel', () => {
  it('returns counts for every status', async () => {
    const cookie = await registerAndGetCookie();

    seedApplication({ status: 'APPLIED' });
    seedApplication({ status: 'OFFER' });

    const res = await request(app).get('/stats/funnel').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const funnel = res.body.funnel as { status: string; count: number }[];
    expect(funnel).toHaveLength(7);
    expect(funnel.find((f) => f.status === 'APPLIED')?.count).toBe(1);
    expect(funnel.find((f) => f.status === 'OFFER')?.count).toBe(1);
    expect(funnel.find((f) => f.status === 'REJECTED')?.count).toBe(0);
  });
});

describe('GET /stats/sources', () => {
  it('breaks down applications by source, sorted by count', async () => {
    const cookie = await registerAndGetCookie();

    seedApplication({ status: 'APPLIED', source: 'LinkedIn' });
    seedApplication({ status: 'APPLIED', source: 'LinkedIn' });
    seedApplication({ status: 'APPLIED', source: '' });

    const res = await request(app).get('/stats/sources').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.sources).toEqual([
      { source: 'LinkedIn', count: 2 },
      { source: 'Unknown', count: 1 },
    ]);
  });
});

describe('GET /stats/salary', () => {
  it('computes salary stats across applications', async () => {
    const cookie = await registerAndGetCookie();

    seedApplication({ status: 'APPLIED', salaryMin: 50000, salaryMax: 70000 });
    seedApplication({ status: 'OFFER', salaryMax: 120000 });

    const res = await request(app).get('/stats/salary').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.avgSalary).toBe(90000);
    expect(res.body.minSalary).toBe(60000);
    expect(res.body.maxSalary).toBe(120000);
    expect(res.body.byStatus).toEqual([
      { status: 'APPLIED', avgSalary: 60000, count: 1 },
      { status: 'OFFER', avgSalary: 120000, count: 1 },
    ]);
  });

  it('skips applications without salary data', async () => {
    const cookie = await registerAndGetCookie();

    seedApplication({ status: 'APPLIED' });

    const res = await request(app).get('/stats/salary').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.avgSalary).toBeNull();
  });
});

describe('GET /stats/digest', () => {
  it('returns recent activity and upcoming interviews', async () => {
    const cookie = await registerAndGetCookie();

    const application = seedApplication({ status: 'APPLIED', appliedAt: new Date() });
    seedInterview(application.id, new Date(Date.now() + 86_400_000));
    seedInterview(application.id, new Date(Date.now() - 2 * 86_400_000));

    const res = await request(app).get('/stats/digest').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.recentActivity).toHaveLength(1);
    expect(res.body.recentActivity[0].job.company.name).toBe('Acme');
    expect(res.body.upcomingInterviews).toHaveLength(1);
  });
});

describe('GET /stats/export', () => {
  it('returns applications as CSV', async () => {
    const cookie = await registerAndGetCookie();

    seedApplication({ status: 'OFFER', companyName: 'Google, Inc', salaryMin: 100000 });
    seedApplication({ status: 'APPLIED', companyName: 'Acme' });

    const res = await request(app).get('/stats/export').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Company,Job Title,Status');
    expect(res.text).toContain('"Google, Inc"');
    expect(res.text).toContain('Acme');
  });
});

describe('Stats authentication', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/stats/overview');
    expect(res.status).toBe(401);
  });
});
