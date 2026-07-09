import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, getAuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

const ALL_STATUSES = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const;

const RESPONDED_STATUSES = ['SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED'] as const;

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

router.get('/overview', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const now = new Date();

    const [totalApplications, activeApplications, appliedCount, respondedApplications, offers, upcomingInterviews] =
      await Promise.all([
        prisma.application.count({ where: { userId } }),
        prisma.application.count({
          where: { userId, status: { notIn: ['REJECTED', 'WITHDRAWN'] } },
        }),
        prisma.application.count({ where: { userId, status: { not: 'SAVED' } } }),
        prisma.application.findMany({
          where: { userId, status: { in: [...RESPONDED_STATUSES] }, appliedAt: { not: null } },
          select: { appliedAt: true, updatedAt: true },
        }),
        prisma.application.count({ where: { userId, status: 'OFFER' } }),
        prisma.interview.count({
          where: { scheduledAt: { gte: now }, application: { userId } },
        }),
      ]);

    const respondedCount = respondedApplications.length;
    const responseRate = appliedCount > 0 ? respondedCount / appliedCount : 0;

    const avgDaysToResponse =
      respondedCount > 0
        ? respondedApplications.reduce((sum, app) => {
            const days = (app.updatedAt.getTime() - app.appliedAt!.getTime()) / 86_400_000;
            return sum + Math.max(0, days);
          }, 0) / respondedCount
        : null;

    res.json({
      totalApplications,
      activeApplications,
      responseRate,
      avgDaysToResponse,
      offers,
      upcomingInterviews,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/timeline', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const weeks = clampInt(req.query.weeks, 12, 1, 52);

    const rangeStart = startOfWeek(new Date());
    rangeStart.setUTCDate(rangeStart.getUTCDate() - (weeks - 1) * 7);

    const applications = await prisma.application.findMany({
      where: { userId, createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    });

    const counts = new Map<string, number>();
    for (const app of applications) {
      const key = startOfWeek(app.createdAt).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const buckets: { weekStart: string; count: number }[] = [];
    const cursor = new Date(rangeStart);
    for (let i = 0; i < weeks; i++) {
      const key = cursor.toISOString().slice(0, 10);
      buckets.push({ weekStart: key, count: counts.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    res.json({ weeks: buckets });
  } catch (error) {
    next(error);
  }
});

router.get('/funnel', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);

    const grouped = await prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });

    const countsByStatus = new Map(grouped.map((g) => [g.status, g._count._all]));

    res.json({
      funnel: ALL_STATUSES.map((status) => ({
        status,
        count: countsByStatus.get(status) ?? 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sources', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);

    const applications = await prisma.application.findMany({
      where: { userId },
      select: { job: { select: { source: true } } },
    });

    const counts = new Map<string, number>();
    for (const app of applications) {
      const source = app.job.source?.trim() || 'Unknown';
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }

    const sources = Array.from(counts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ sources });
  } catch (error) {
    next(error);
  }
});

router.get('/salary', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);

    const applications = await prisma.application.findMany({
      where: { userId },
      select: {
        status: true,
        job: { select: { salaryMin: true, salaryMax: true } },
      },
    });

    const midpoints: number[] = [];
    const byStatus = new Map<string, number[]>();

    for (const app of applications) {
      const { salaryMin, salaryMax } = app.job;
      if (salaryMin == null && salaryMax == null) continue;

      const midpoint =
        salaryMin != null && salaryMax != null
          ? (salaryMin + salaryMax) / 2
          : (salaryMin ?? salaryMax)!;

      midpoints.push(midpoint);
      const bucket = byStatus.get(app.status) ?? [];
      bucket.push(midpoint);
      byStatus.set(app.status, bucket);
    }

    const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

    res.json({
      count: midpoints.length,
      avgSalary: midpoints.length > 0 ? avg(midpoints) : null,
      minSalary: midpoints.length > 0 ? Math.min(...midpoints) : null,
      maxSalary: midpoints.length > 0 ? Math.max(...midpoints) : null,
      byStatus: ALL_STATUSES.filter((status) => byStatus.has(status)).map((status) => ({
        status,
        avgSalary: avg(byStatus.get(status)!),
        count: byStatus.get(status)!.length,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/digest', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const weekAhead = new Date(now.getTime() + 7 * 86_400_000);

    const [recentActivity, upcomingInterviews] = await Promise.all([
      prisma.application.findMany({
        where: { userId, updatedAt: { gte: weekAgo } },
        orderBy: { updatedAt: 'desc' },
        include: { job: { include: { company: { select: { id: true, name: true } } } } },
      }),
      prisma.interview.findMany({
        where: {
          scheduledAt: { gte: now, lte: weekAhead },
          application: { userId },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          application: {
            include: { job: { include: { company: { select: { id: true, name: true } } } } },
          },
        },
      }),
    ]);

    res.json({ recentActivity, upcomingInterviews });
  } catch (error) {
    next(error);
  }
});

function toCsvField(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/export', async (req, res, next) => {
  try {
    const { userId } = getAuthenticatedRequest(req);

    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { job: { include: { company: { select: { name: true } } } } },
    });

    const header = [
      'Company',
      'Job Title',
      'Status',
      'Applied At',
      'Location',
      'Salary Min',
      'Salary Max',
      'Source',
      'Created At',
    ];

    const rows = applications.map((app) =>
      [
        toCsvField(app.job.company.name),
        toCsvField(app.job.title),
        toCsvField(app.status),
        toCsvField(app.appliedAt?.toISOString().slice(0, 10)),
        toCsvField(app.job.location),
        toCsvField(app.job.salaryMin),
        toCsvField(app.job.salaryMax),
        toCsvField(app.job.source),
        toCsvField(app.createdAt.toISOString().slice(0, 10)),
      ].join(',')
    );

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
