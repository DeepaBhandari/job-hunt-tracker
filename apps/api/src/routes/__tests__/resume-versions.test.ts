import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';

vi.mock('../../lib/ai.js', () => ({}));

const h = vi.hoisted(() => ({ filePath: '' }));

vi.mock('../../lib/storage.js', () => ({
  deleteResumeFile: vi.fn(async () => {}),
  resolveResumeFilePath: vi.fn(() => h.filePath),
  saveResumeFile: vi.fn(async () => 'resumes/mock.pdf'),
}));

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const mockResumeVersions = new Map<string, {
  id: string; userId: string; label: string; filePath: string; uploadedAt: Date;
}>();
const mockApplications = new Map<string, {
  id: string; jobId: string; userId: string; resumeVersionId: string | null;
}>();
const state = { resumeCounter: 0, userCounter: 0 };

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
      findMany: vi.fn(async ({ where }: { where: { resumeVersionId?: string } }) => {
        if (where.resumeVersionId) {
          return Array.from(mockApplications.values()).filter(
            (a) => a.resumeVersionId === where.resumeVersionId
          );
        }
        return [];
      }),
    },
    resumeVersion: {
      findMany: vi.fn(async ({ where, orderBy }: { where: { userId: string }; orderBy?: Record<string, string> }) => {
        let results = Array.from(mockResumeVersions.values()).filter(
          (r) => r.userId === where.userId
        );
        if (orderBy?.uploadedAt === 'desc') {
          results.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
        }
        return results;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.resumeCounter++;
        const resumeVersion = {
          id: `resume_${state.resumeCounter}`,
          userId: data.userId as string,
          label: data.label as string,
          filePath: data.filePath as string,
          uploadedAt: new Date(),
        };
        mockResumeVersions.set(resumeVersion.id, resumeVersion);
        return resumeVersion;
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const resumeVersion = Array.from(mockResumeVersions.values()).find(
          (r) => r.id === where.id && r.userId === where.userId
        );
        return resumeVersion ?? null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = mockResumeVersions.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        mockResumeVersions.set(where.id, updated as typeof existing);
        return updated;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        mockResumeVersions.delete(where.id);
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

let tempDir: string;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  tempDir = mkdtempSync(path.join(tmpdir(), 'jht-'));
  const filePath = path.join(tempDir, 'resume.pdf');
  writeFileSync(filePath, 'mock resume content');
  h.filePath = filePath;
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  mockUsers.clear();
  mockResumeVersions.clear();
  mockApplications.clear();
  state.resumeCounter = 0;
  state.userCounter = 0;
  vi.clearAllMocks();
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

describe('Resume version CRUD', () => {
  it('POST /resume-versions creates a resume version', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'v2 - updated', filePath: 'resumes/sample.pdf' });

    expect(res.status).toBe(201);
    expect(res.body.resumeVersion.label).toBe('v2 - updated');
    expect(res.body.resumeVersion.filePath).toBe('resumes/sample.pdf');
  });

  it('GET /resume-versions lists resume versions for the user', async () => {
    const cookie = await registerAndGetCookie();

    await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'First', filePath: 'resumes/a.pdf' });
    await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'Second', filePath: 'resumes/b.pdf' });

    const res = await request(app).get('/resume-versions').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.resumeVersions).toHaveLength(2);
  });

  it('GET /resume-versions/:id returns a single resume version', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'Solo', filePath: 'resumes/solo.pdf' });

    const id = createRes.body.resumeVersion.id;

    const res = await request(app).get(`/resume-versions/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.resumeVersion.label).toBe('Solo');
  });

  it('GET /resume-versions/:id/file downloads the resume', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'Downloadable', filePath: 'resumes/download.pdf' });

    const id = createRes.body.resumeVersion.id;

    const res = await request(app).get(`/resume-versions/${id}/file`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.toString()).toContain('mock resume content');
  });

  it('PATCH /resume-versions/:id updates the label', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'Old Label', filePath: 'resumes/patch.pdf' });

    const id = createRes.body.resumeVersion.id;

    const res = await request(app)
      .patch(`/resume-versions/${id}`)
      .set('Cookie', cookie)
      .send({ label: 'New Label' });

    expect(res.status).toBe(200);
    expect(res.body.resumeVersion.label).toBe('New Label');
  });

  it('DELETE /resume-versions/:id removes a resume version', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'Delete Me', filePath: 'resumes/delete.pdf' });

    const id = createRes.body.resumeVersion.id;

    const res = await request(app).delete(`/resume-versions/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/resume-versions/${id}`).set('Cookie', cookie);
    expect(getRes.status).toBe(404);
  });

  it('rejects deleting a resume version in use by an application', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'In Use', filePath: 'resumes/inuse.pdf' });

    const id = createRes.body.resumeVersion.id;

    mockApplications.set('capplication_1', {
      id: 'capplication_1',
      jobId: 'cjob_0001',
      userId: 'user_1',
      resumeVersionId: id,
    });

    const res = await request(app).delete(`/resume-versions/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/in use/i);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/resume-versions');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a nonexistent resume version', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app).get('/resume-versions/cnonexistent').set('Cookie', cookie);

    expect(res.status).toBe(404);
  });

  it('returns 404 when accessing another user\'s resume version', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: 'Mine', filePath: 'resumes/mine.pdf' });

    const id = createRes.body.resumeVersion.id;

    const otherRes = await request(app)
      .post('/auth/register')
      .send({ email: 'other@example.com', password: 'password123', name: 'Other' });
    const otherCookie = extractCookie(otherRes);

    const res = await request(app).get(`/resume-versions/${id}`).set('Cookie', otherCookie);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid body', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/resume-versions')
      .set('Cookie', cookie)
      .send({ label: '' });

    expect(res.status).toBe(400);
  });
});
