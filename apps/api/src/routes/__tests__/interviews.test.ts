import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const mockApplications = new Map<string, {
  id: string; jobId: string; userId: string; status: string;
  appliedAt: Date | null; resumeVersionId: string | null;
  coverLetter: string | null; notes: string | null; createdAt: Date;
}>();
const mockInterviews = new Map<string, {
  id: string; applicationId: string; scheduledAt: Date; type: string;
  interviewerName: string | null; notes: string | null; outcome: string | null;
}>();
const state = { interviewCounter: 0, userCounter: 0 };

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
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const application = Array.from(mockApplications.values()).find(
          (a) => a.id === where.id && a.userId === where.userId
        );
        return application ?? null;
      }),
    },
    interview: {
      findMany: vi.fn(async ({ where, orderBy }: { where: { applicationId: string }; orderBy?: Record<string, string> }) => {
        let results = Array.from(mockInterviews.values()).filter(
          (i) => i.applicationId === where.applicationId
        );
        if (orderBy?.scheduledAt === 'asc') {
          results.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
        }
        return results;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return mockInterviews.get(where.id) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.interviewCounter++;
        const interview = {
          id: `cinterview_${state.interviewCounter}`,
          applicationId: data.applicationId as string,
          scheduledAt: data.scheduledAt as Date,
          type: data.type as string,
          interviewerName: (data.interviewerName as string) ?? null,
          notes: (data.notes as string) ?? null,
          outcome: null,
        };
        mockInterviews.set(interview.id, interview);
        return interview;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = mockInterviews.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        mockInterviews.set(where.id, updated as typeof existing);
        return updated;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        mockInterviews.delete(where.id);
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
  mockApplications.clear();
  mockInterviews.clear();
  state.interviewCounter = 0;
  state.userCounter = 0;
  vi.clearAllMocks();

  mockApplications.set('capplication_1', {
    id: 'capplication_1',
    jobId: 'cjob_0001',
    userId: 'user_1',
    status: 'INTERVIEW',
    appliedAt: null,
    resumeVersionId: null,
    coverLetter: null,
    notes: null,
    createdAt: new Date(),
  });
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

describe('Interview CRUD', () => {
  it('POST /interviews creates an interview', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({
        applicationId: 'capplication_1',
        scheduledAt: new Date().toISOString(),
        type: 'VIDEO',
        interviewerName: 'Jane Doe',
      });

    expect(res.status).toBe(201);
    expect(res.body.interview.type).toBe('VIDEO');
    expect(res.body.interview.interviewerName).toBe('Jane Doe');
  });

  it('GET /interviews/by-application/:applicationId lists interviews', async () => {
    const cookie = await registerAndGetCookie();

    await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', scheduledAt: new Date().toISOString(), type: 'PHONE' });
    await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', scheduledAt: new Date().toISOString(), type: 'ONSITE' });

    const res = await request(app)
      .get('/interviews/by-application/capplication_1')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.interviews).toHaveLength(2);
  });

  it('GET /interviews/:id returns a single interview', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', scheduledAt: new Date().toISOString(), type: 'HR' });

    const id = createRes.body.interview.id;

    const res = await request(app).get(`/interviews/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.interview.type).toBe('HR');
  });

  it('PATCH /interviews/:id updates an interview', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', scheduledAt: new Date().toISOString(), type: 'TECHNICAL' });

    const id = createRes.body.interview.id;

    const res = await request(app)
      .patch(`/interviews/${id}`)
      .set('Cookie', cookie)
      .send({ outcome: 'HIRED', notes: 'Went well' });

    expect(res.status).toBe(200);
    expect(res.body.interview.outcome).toBe('HIRED');
    expect(res.body.interview.notes).toBe('Went well');
  });

  it('DELETE /interviews/:id removes an interview', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', scheduledAt: new Date().toISOString(), type: 'PHONE' });

    const id = createRes.body.interview.id;

    const res = await request(app).delete(`/interviews/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/interviews/${id}`).set('Cookie', cookie);
    expect(getRes.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/interviews');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid type', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', scheduledAt: new Date().toISOString(), type: 'NOT_A_TYPE' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing scheduledAt', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', type: 'PHONE' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an application the user does not own', async () => {
    const cookie = await registerAndGetCookie();

    mockApplications.set('capplication_2', {
      id: 'capplication_2',
      jobId: 'cjob_0002',
      userId: 'user_2',
      status: 'APPLIED',
      appliedAt: null,
      resumeVersionId: null,
      coverLetter: null,
      notes: null,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_2', scheduledAt: new Date().toISOString(), type: 'PHONE' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/application not found/i);
  });

  it("returns 403 when accessing another user's interview", async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/interviews')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', scheduledAt: new Date().toISOString(), type: 'PHONE' });

    const id = createRes.body.interview.id;

    const otherRes = await request(app)
      .post('/auth/register')
      .send({ email: 'other@example.com', password: 'password123', name: 'Other' });
    const otherCookie = extractCookie(otherRes);

    const res = await request(app).get(`/interviews/${id}`).set('Cookie', otherCookie);
    expect(res.status).toBe(403);
  });

  it('returns 404 for a nonexistent interview', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app).get('/interviews/cnonexistent_1').set('Cookie', cookie);

    expect(res.status).toBe(404);
  });
});
