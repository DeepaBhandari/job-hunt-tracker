import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({
  generateCoverLetter: vi.fn(async () => 'Your cover letter'),
  summarizeJobPosting: vi.fn(async () => 'Job summary'),
  analyzeResumeGap: vi.fn(async () => 'Gap analysis'),
  generateInterviewPrep: vi.fn(async () => 'Interview prep questions'),
}));

import {
  generateCoverLetter,
  summarizeJobPosting,
  analyzeResumeGap,
  generateInterviewPrep,
} from '../../lib/ai.js';

const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string | null; googleId: string | null; createdAt: Date }>();
const mockCompanies = new Map<string, { id: string; userId: string; name: string }>();
const mockJobs = new Map<string, {
  id: string; companyId: string; userId: string; title: string;
  description: string | null; url: string | null; location: string | null;
}>();
const mockApplications = new Map<string, {
  id: string; jobId: string; userId: string; status: string;
  resumeVersionId: string | null;
}>();
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
    job: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const job = Array.from(mockJobs.values()).find(
          (j) => j.id === where.id && j.userId === where.userId
        );
        if (!job) return null;
        const company = mockCompanies.get(job.companyId);
        return {
          ...job,
          company: company ? { id: company.id, name: company.name } : null,
        };
      }),
    },
    application: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const application = Array.from(mockApplications.values()).find(
          (a) => a.id === where.id && a.userId === where.userId
        );
        if (!application) return null;
        const job = mockJobs.get(application.jobId);
        const company = job ? mockCompanies.get(job.companyId) : null;
        return {
          ...application,
          job: job
            ? {
                ...job,
                company: company ? { id: company.id, name: company.name } : null,
              }
            : null,
        };
      }),
    },
  },
}));

const mockFetch = vi.fn(async () => ({
  ok: true,
  text: async () => '<html><script>ignored</script><h1>Frontend Engineer</h1><p>React and TypeScript</p></html>',
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
  vi.stubGlobal('fetch', mockFetch);
});

beforeEach(() => {
  mockUsers.clear();
  mockCompanies.clear();
  mockJobs.clear();
  mockApplications.clear();
  state.userCounter = 0;
  vi.clearAllMocks();

  mockCompanies.set('company_1', { id: 'company_1', userId: 'user_1', name: 'Acme Corp' });
  mockJobs.set('cjob_0001', {
    id: 'cjob_0001',
    companyId: 'company_1',
    userId: 'user_1',
    title: 'Software Engineer',
    description: 'Build and ship features.',
    url: 'https://acme.example.com/jobs/se',
    location: 'Remote',
  });
  mockApplications.set('capplication_1', {
    id: 'capplication_1',
    jobId: 'cjob_0001',
    userId: 'user_1',
    status: 'INTERVIEW',
    resumeVersionId: null,
  });
});

async function registerAndGetCookie(): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'password123', name: 'Test' });
  return extractCookie(res);
}

describe('POST /ai/cover-letter', () => {
  it('generates a cover letter from a job', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/cover-letter')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001', resumeSummary: '5 years of React', tone: 'confident' });

    expect(res.status).toBe(200);
    expect(res.body.coverLetter).toBe('Your cover letter');
    expect(generateCoverLetter).toHaveBeenCalledWith(
      expect.stringContaining('Acme Corp')
    );
    expect(generateCoverLetter).toHaveBeenCalledWith(
      expect.stringContaining('5 years of React')
    );
  });

  it('returns 404 for a job the user does not own', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/cover-letter')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_9999' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid jobId', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/cover-letter')
      .set('Cookie', cookie)
      .send({ jobId: 'not-a-cuid' });

    expect(res.status).toBe(400);
  });
});

describe('POST /ai/parse-job-url', () => {
  it('fetches and summarizes a job posting URL', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/parse-job-url')
      .set('Cookie', cookie)
      .send({ url: 'https://acme.example.com/jobs/se' });

    expect(res.status).toBe(200);
    expect(res.body.summary).toBe('Job summary');
    expect(res.body.url).toBe('https://acme.example.com/jobs/se');
    expect(summarizeJobPosting).toHaveBeenCalled();
  });

  it('returns 400 when the URL cannot be fetched', async () => {
    const cookie = await registerAndGetCookie();

    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const res = await request(app)
      .post('/ai/parse-job-url')
      .set('Cookie', cookie)
      .send({ url: 'https://acme.example.com/404' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unable to fetch/i);
  });

  it('returns 400 for an invalid URL', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/parse-job-url')
      .set('Cookie', cookie)
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
  });
});

describe('POST /ai/resume-gap', () => {
  it('analyzes resume gaps against a job', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/resume-gap')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_0001', resumeText: 'Experienced in Go' });

    expect(res.status).toBe(200);
    expect(res.body.analysis).toBe('Gap analysis');
    expect(analyzeResumeGap).toHaveBeenCalledWith(
      expect.stringContaining('Software Engineer')
    );
  });

  it('returns 404 for a job the user does not own', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/resume-gap')
      .set('Cookie', cookie)
      .send({ jobId: 'cjob_9999', resumeText: 'Anything' });

    expect(res.status).toBe(404);
  });
});

describe('POST /ai/interview-prep', () => {
  it('generates interview prep for an application', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/interview-prep')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', stage: 'TECHNICAL' });

    expect(res.status).toBe(200);
    expect(res.body.prep).toBe('Interview prep questions');
    expect(generateInterviewPrep).toHaveBeenCalledWith(
      expect.stringContaining('Acme Corp')
    );
  });

  it('returns 404 for an application the user does not own', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/interview-prep')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_9', stage: 'HR' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid stage', async () => {
    const cookie = await registerAndGetCookie();

    const res = await request(app)
      .post('/ai/interview-prep')
      .set('Cookie', cookie)
      .send({ applicationId: 'capplication_1', stage: 'NOT_A_STAGE' });

    expect(res.status).toBe(400);
  });
});

describe('AI authentication', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/ai/cover-letter').send({ jobId: 'cjob_0001' });
    expect(res.status).toBe(401);
  });
});
