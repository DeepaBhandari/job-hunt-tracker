import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

vi.mock('../../lib/storage.js', () => ({
  deleteResumeFile: vi.fn(async () => {}),
  resolveResumeFilePath: vi.fn(() => 'resumes/mock.pdf'),
  saveResumeFile: vi.fn(async () => 'resumes/mock.pdf'),
}));

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const state = { userCounter: 0 };

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
  state.userCounter = 0;
  vi.clearAllMocks();
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

describe('POST /resume-upload', () => {
  it('uploads a resume file and returns its stored path', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/resume-upload')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('%PDF-1.4 fake resume'), 'resume.pdf');

    expect(res.status).toBe(200);
    expect(res.body.filePath).toBe('resumes/mock.pdf');
  });

  it('returns 400 when no file is provided', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app).post('/resume-upload').set('Cookie', cookie);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file is required/i);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/resume-upload')
      .attach('file', Buffer.from('%PDF-1.4 fake resume'), 'resume.pdf');

    expect(res.status).toBe(401);
  });
});
