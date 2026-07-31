import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const mockCompanies = new Map<string, { id: string; userId: string; name: string }>();
const mockContacts = new Map<string, {
  id: string; companyId: string; userId: string; name: string;
  role: string | null; email: string | null; linkedinUrl: string | null; notes: string | null;
}>();
const state = { contactCounter: 0, userCounter: 0 };

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
    contact: {
      findMany: vi.fn(async ({ where, include }: { where: { userId: string; companyId?: string }; include?: { company?: unknown } }) => {
        let results = Array.from(mockContacts.values()).filter((c) => c.userId === where.userId);
        if (where.companyId) {
          results = results.filter((c) => c.companyId === where.companyId);
        }
        results.sort((a, b) => a.name.localeCompare(b.name));
        if (include?.company) {
          return results.map((c) => ({
            ...c,
            company: mockCompanies.get(c.companyId)
              ? { id: mockCompanies.get(c.companyId)!.id, name: mockCompanies.get(c.companyId)!.name }
              : null,
          }));
        }
        return results;
      }),
      findFirst: vi.fn(async ({ where, include }: { where: { id: string; userId: string }; include?: { company?: unknown } }) => {
        const contact = Array.from(mockContacts.values()).find(
          (c) => c.id === where.id && c.userId === where.userId
        );
        if (!contact) return null;
        if (include?.company) {
          return {
            ...contact,
            company: mockCompanies.get(contact.companyId)
              ? { id: mockCompanies.get(contact.companyId)!.id, name: mockCompanies.get(contact.companyId)!.name }
              : null,
          };
        }
        return contact;
      }),
      create: vi.fn(async ({ data, include }: { data: Record<string, unknown>; include?: { company?: unknown } }) => {
        state.contactCounter++;
        const contact = {
          id: `contact_${state.contactCounter}`,
          companyId: data.companyId as string,
          userId: data.userId as string,
          name: data.name as string,
          role: (data.role as string) ?? null,
          email: (data.email as string) ?? null,
          linkedinUrl: (data.linkedinUrl as string) ?? null,
          notes: (data.notes as string) ?? null,
        };
        mockContacts.set(contact.id, contact);
        if (include?.company) {
          return {
            ...contact,
            company: mockCompanies.get(contact.companyId)
              ? { id: mockCompanies.get(contact.companyId)!.id, name: mockCompanies.get(contact.companyId)!.name }
              : null,
          };
        }
        return contact;
      }),
      update: vi.fn(async ({ where, data, include }: { where: { id: string }; data: Record<string, unknown>; include?: { company?: unknown } }) => {
        const existing = mockContacts.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        mockContacts.set(where.id, updated as typeof existing);
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
        mockContacts.delete(where.id);
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
  mockContacts.clear();
  state.contactCounter = 0;
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

describe('Contact CRUD', () => {
  it('POST /contacts creates a contact', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', name: 'Jane Doe', role: 'Recruiter' });

    expect(res.status).toBe(201);
    expect(res.body.contact.name).toBe('Jane Doe');
    expect(res.body.contact.role).toBe('Recruiter');
    expect(res.body.contact.company.name).toBe('Acme Corp');
  });

  it('GET /contacts lists all contacts for the user', async () => {
    const cookie = await registerAndGetCookie();

    await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', name: 'Contact A' });
    await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', name: 'Contact B' });

    const res = await request(app).get('/contacts').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.contacts).toHaveLength(2);
  });

  it('GET /contacts filters by companyId', async () => {
    const cookie = await registerAndGetCookie();

    mockCompanies.set('company_2', { id: 'company_2', userId: 'user_1', name: 'Other Inc' });

    await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', name: 'Acme Contact' });
    await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_2', name: 'Other Contact' });

    const res = await request(app)
      .get('/contacts')
      .set('Cookie', cookie)
      .query({ companyId: 'company_1' });

    expect(res.status).toBe(200);
    expect(res.body.contacts).toHaveLength(1);
    expect(res.body.contacts[0].name).toBe('Acme Contact');
  });

  it('GET /contacts/:id returns a single contact', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', name: 'Solo Contact' });

    const id = createRes.body.contact.id;

    const res = await request(app).get(`/contacts/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.contact.name).toBe('Solo Contact');
    expect(res.body.contact).toHaveProperty('company');
  });

  it('PATCH /contacts/:id updates a contact', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', name: 'Old Name' });

    const id = createRes.body.contact.id;

    const res = await request(app)
      .patch(`/contacts/${id}`)
      .set('Cookie', cookie)
      .send({ role: 'Hiring Manager', email: 'jane@acme.com' });

    expect(res.status).toBe(200);
    expect(res.body.contact.role).toBe('Hiring Manager');
    expect(res.body.contact.email).toBe('jane@acme.com');
  });

  it('DELETE /contacts/:id removes a contact', async () => {
    const cookie = await registerAndGetCookie();

    const createRes = await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1', name: 'Delete Me' });

    const id = createRes.body.contact.id;

    const res = await request(app).delete(`/contacts/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/contacts/${id}`).set('Cookie', cookie);
    expect(getRes.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/contacts');
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing name', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when company is not owned by the user', async () => {
    const cookie = await registerAndGetCookie();

    mockCompanies.set('company_2', { id: 'company_2', userId: 'user_2', name: 'Foreign Corp' });

    const res = await request(app)
      .post('/contacts')
      .set('Cookie', cookie)
      .send({ companyId: 'company_2', name: 'Nope' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/company not found/i);
  });
});
