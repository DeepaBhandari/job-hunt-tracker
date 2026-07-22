import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

const mockCompanies = new Map<string, { id: string; userId: string; name: string; website: string | null; industry: string | null; size: string | null; notes: string | null }>();
const state = { companyCounter: 0 };

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.id === 'user_1') {
          return { id: 'user_1', email: 'test@example.com', passwordHash: 'hash', name: 'Test', googleId: null, createdAt: new Date() };
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: { email: string; passwordHash: string; name?: string } }) => {
        return { id: 'user_1', email: data.email, passwordHash: data.passwordHash, name: data.name ?? null, googleId: null, createdAt: new Date() };
      }),
    },
    company: {
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) => {
        const results = Array.from(mockCompanies.values()).filter((c) => c.userId === where.userId);
        return results.map((c) => ({ ...c, _count: { jobs: 0 } }));
      }),
      findFirst: vi.fn(async ({ where, include }: { where: { id: string; userId: string }; include?: { jobs?: unknown } }) => {
        const company = Array.from(mockCompanies.values()).find((c) => c.id === where.id && c.userId === where.userId);
        if (!company) return null;
        if (include?.jobs) return { ...company, jobs: [] };
        return company;
      }),
      create: vi.fn(async ({ data }: { data: { userId: string; name: string; website?: string; industry?: string; size?: string; notes?: string } }) => {
        state.companyCounter++;
        const company = {
          id: `company_${state.companyCounter}`,
          userId: data.userId,
          name: data.name,
          website: data.website ?? null,
          industry: data.industry ?? null,
          size: data.size ?? null,
          notes: data.notes ?? null,
        };
        mockCompanies.set(company.id, company);
        return { ...company, _count: { jobs: 0 } };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = mockCompanies.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        mockCompanies.set(where.id, updated as typeof existing);
        return updated;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        mockCompanies.delete(where.id);
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
  mockCompanies.clear();
  state.companyCounter = 0;
  vi.clearAllMocks();
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

describe('Company CRUD', () => {
  it('POST /companies creates a company', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/companies')
      .set('Cookie', cookie)
      .send({ name: 'Acme Corp', website: 'https://acme.com' });

    expect(res.status).toBe(201);
    expect(res.body.company.name).toBe('Acme Corp');
    expect(res.body.company.website).toBe('https://acme.com');
  });

  it('GET /companies lists all companies for the user', async () => {
    const cookie = await registerAndGetCookie();

    await request(app).post('/companies').set('Cookie', cookie).send({ name: 'Company A' });
    await request(app).post('/companies').set('Cookie', cookie).send({ name: 'Company B' });

    const res = await request(app).get('/companies').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.companies).toHaveLength(2);
  });

  it('GET /companies/:id returns a single company with jobs', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/companies')
      .set('Cookie', cookie)
      .send({ name: 'Solo Corp' });

    const id = createRes.body.company.id;

    const res = await request(app).get(`/companies/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.company.name).toBe('Solo Corp');
    expect(res.body.company).toHaveProperty('jobs');
  });

  it('PATCH /companies/:id updates a company', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/companies')
      .set('Cookie', cookie)
      .send({ name: 'Old Name' });

    const id = createRes.body.company.id;

    const res = await request(app)
      .patch(`/companies/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'New Name', industry: 'Tech' });

    expect(res.status).toBe(200);
    expect(res.body.company.name).toBe('New Name');
  });

  it('DELETE /companies/:id removes a company', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/companies')
      .set('Cookie', cookie)
      .send({ name: 'Delete Me' });

    const id = createRes.body.company.id;

    const res = await request(app).delete(`/companies/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(204);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/companies');
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing name', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/companies')
      .set('Cookie', cookie)
      .send({ website: 'https://example.com' });

    expect(res.status).toBe(400);
  });
});
