'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppHeader } from '@/components/app-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Icons } from '@/lib/icons';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface OverviewStats {
  totalApplications: number;
  activeApplications: number;
  responseRate: number;
  avgDaysToResponse: number | null;
  offers: number;
  upcomingInterviews: number;
}

interface TimelineWeek {
  weekStart: string;
  count: number;
}

interface FunnelStage {
  status: string;
  count: number;
}

interface Source {
  source: string;
  count: number;
}

interface SalaryStats {
  count: number;
  avgSalary: number | null;
  minSalary: number | null;
  maxSalary: number | null;
  byStatus: { status: string; avgSalary: number; count: number }[];
}

interface Company {
  id: string;
  name: string;
}

interface DigestApplication {
  id: string;
  status: string;
  updatedAt: string;
  job: { title: string; company: Company };
}

interface DigestInterview {
  id: string;
  scheduledAt: string;
  type: string;
  application: { job: { title: string; company: Company } };
}

interface DigestData {
  recentActivity: DigestApplication[];
  upcomingInterviews: DigestInterview[];
}

const STATUS_COLORS: Record<string, string> = {
  SAVED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  APPLIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SCREENING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  INTERVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  OFFER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WITHDRAWN: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};

const FUNNEL_STAGES = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'];
const FUNNEL_OPACITY = [0.45, 0.6, 0.72, 0.86, 1];
const SOURCE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
const OTHER_COLOR = 'var(--muted-foreground)';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatWeekLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function StatTile({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
          <span className="text-2xl font-bold tabular-nums">{value}</span>
        </div>
        <Icon className="text-muted-foreground size-5" />
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      {label && <p className="font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground">
          {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => apiFetch<OverviewStats>('/stats/overview'),
  });

  const { data: timeline } = useQuery({
    queryKey: ['stats', 'timeline'],
    queryFn: () => apiFetch<{ weeks: TimelineWeek[] }>('/stats/timeline'),
  });

  const { data: funnelData } = useQuery({
    queryKey: ['stats', 'funnel'],
    queryFn: () => apiFetch<{ funnel: FunnelStage[] }>('/stats/funnel'),
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['stats', 'sources'],
    queryFn: () => apiFetch<{ sources: Source[] }>('/stats/sources'),
  });

  const { data: salary } = useQuery({
    queryKey: ['stats', 'salary'],
    queryFn: () => apiFetch<SalaryStats>('/stats/salary'),
  });

  const { data: digest } = useQuery({
    queryKey: ['stats', 'digest'],
    queryFn: () => apiFetch<DigestData>('/stats/digest'),
  });

  const funnelByStatus = new Map((funnelData?.funnel ?? []).map((f) => [f.status, f.count]));
  const forwardFunnel = FUNNEL_STAGES.map((status, i) => ({
    status,
    count: funnelByStatus.get(status) ?? 0,
    fillOpacity: FUNNEL_OPACITY[i],
  }));
  const rejectedCount = funnelByStatus.get('REJECTED') ?? 0;
  const withdrawnCount = funnelByStatus.get('WITHDRAWN') ?? 0;

  const rawSources = sourcesData?.sources ?? [];
  const topSources = rawSources.slice(0, 5);
  const otherCount = rawSources.slice(5).reduce((sum, s) => sum + s.count, 0);
  const sourceRows = [
    ...topSources.map((s, i) => ({ ...s, color: SOURCE_COLORS[i] })),
    ...(otherCount > 0 ? [{ source: 'Other', count: otherCount, color: OTHER_COLOR }] : []),
  ];
  const maxSourceCount = Math.max(1, ...sourceRows.map((s) => s.count));

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <a
            href="/api/stats/export"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Icons.Download data-icon="inline-start" />
            Export CSV
          </a>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Insights across your job search pipeline.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            label="Total Applications"
            value={overviewLoading ? '—' : String(overview?.totalApplications ?? 0)}
            Icon={Icons.BriefcaseBusiness}
          />
          <StatTile
            label="Active"
            value={overviewLoading ? '—' : String(overview?.activeApplications ?? 0)}
            Icon={Icons.TrendingUp}
          />
          <StatTile
            label="Response Rate"
            value={
              overviewLoading ? '—' : `${Math.round((overview?.responseRate ?? 0) * 100)}%`
            }
            Icon={Icons.Percent}
          />
          <StatTile
            label="Avg. Days to Respond"
            value={
              overviewLoading || overview?.avgDaysToResponse == null
                ? '—'
                : overview.avgDaysToResponse.toFixed(1)
            }
            Icon={Icons.Clock}
          />
          <StatTile
            label="Offers"
            value={overviewLoading ? '—' : String(overview?.offers ?? 0)}
            Icon={Icons.Sparkles}
          />
          <StatTile
            label="Interviews (7d)"
            value={overviewLoading ? '—' : String(overview?.upcomingInterviews ?? 0)}
            Icon={Icons.CalendarDays}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Applications Over Time</CardTitle>
            <CardDescription>New applications created per week, last 12 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline?.weeks ?? []} margin={{ left: -20, right: 8 }}>
                  <defs>
                    <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="weekStart"
                    tickFormatter={formatWeekLabel}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    labelFormatter={(value) => formatWeekLabel(String(value))}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Applications"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#timelineFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stage Funnel</CardTitle>
              <CardDescription>Applications currently at each pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={forwardFunnel}
                    layout="vertical"
                    margin={{ left: -10, right: 24 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="status"
                      type="category"
                      width={90}
                      tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Applications" radius={4} fill="var(--chart-1)">
                      {forwardFunnel.map((stage) => (
                        <Cell key={stage.status} fillOpacity={stage.fillOpacity} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        style={{ fill: 'var(--foreground)', fontSize: 12 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex gap-4 border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Rejected <span className="text-foreground font-medium">{rejectedCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Withdrawn <span className="text-foreground font-medium">{withdrawnCount}</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source Breakdown</CardTitle>
              <CardDescription>Where your job leads come from</CardDescription>
            </CardHeader>
            <CardContent>
              {sourceRows.length === 0 ? (
                <Alert>
                  <AlertDescription>No source data yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-col gap-3">
                  {sourceRows.map((row) => (
                    <div key={row.source} className="flex items-center gap-3">
                      <span className="text-foreground w-24 flex-none truncate text-sm">
                        {row.source}
                      </span>
                      <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.count / maxSourceCount) * 100}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground w-6 flex-none text-right text-sm tabular-nums">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Salary Range Tracker</CardTitle>
            <CardDescription>Across jobs with salary data attached to an application</CardDescription>
          </CardHeader>
          <CardContent>
            {!salary || salary.count === 0 ? (
              <Alert>
                <AlertDescription>
                  No salary data yet. Add salary ranges to your job postings to see this.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  label="Average"
                  value={currencyFormatter.format(salary.avgSalary ?? 0)}
                  Icon={Icons.DollarSign}
                />
                <StatTile
                  label="Lowest"
                  value={currencyFormatter.format(salary.minSalary ?? 0)}
                  Icon={Icons.DollarSign}
                />
                <StatTile
                  label="Highest"
                  value={currencyFormatter.format(salary.maxSalary ?? 0)}
                  Icon={Icons.DollarSign}
                />
                <StatTile label="Jobs Tracked" value={String(salary.count)} Icon={Icons.Briefcase} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Applications updated in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {!digest?.recentActivity.length ? (
                <Alert>
                  <AlertDescription>No activity in the past 7 days.</AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-col gap-3">
                  {digest.recentActivity.map((app) => (
                    <div key={app.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{app.job.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {app.job.company.name}
                        </p>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1">
                        <Badge className={STATUS_COLORS[app.status] || 'bg-gray-100'}>
                          {app.status}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(app.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>Scheduled in the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {!digest?.upcomingInterviews.length ? (
                <Alert>
                  <AlertDescription>No interviews scheduled in the next 7 days.</AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-col gap-3">
                  {digest.upcomingInterviews.map((interview) => (
                    <div key={interview.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {interview.application.job.title}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {interview.application.job.company.name}
                        </p>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1">
                        <Badge variant="outline">{interview.type}</Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(interview.scheduledAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
