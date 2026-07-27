'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/lib/icons';
import { apiFetch } from '@/lib/api';

interface Company {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
}

interface Application {
  id: string;
  status: string;
  appliedAt: string | null;
  job: Job & { company: Company };
}

interface Overview {
  totalApplications: number;
  activeApplications: number;
  offers: number;
  upcomingInterviews: number;
}

interface Interview {
  id: string;
  scheduledAt: string;
  type: string;
  application: {
    job: {
      title: string;
      company: Company;
    };
  };
}

interface Digest {
  recentActivity: Application[];
  upcomingInterviews: Interview[];
}

type Status = 'SAVED' | 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

const STATUS_CONFIG: Record<Status, { label: string; dot: string; border: string }> = {
  SAVED: { label: 'Saved', dot: 'bg-slate-400', border: 'border-t-slate-400' },
  APPLIED: { label: 'Applied', dot: 'bg-blue-500', border: 'border-t-blue-500' },
  SCREENING: { label: 'Screening', dot: 'bg-amber-500', border: 'border-t-amber-500' },
  INTERVIEW: { label: 'Interview', dot: 'bg-violet-500', border: 'border-t-violet-500' },
  OFFER: { label: 'Offer', dot: 'bg-emerald-500', border: 'border-t-emerald-500' },
  REJECTED: { label: 'Rejected', dot: 'bg-red-400', border: 'border-t-red-400' },
  WITHDRAWN: { label: 'Withdrawn', dot: 'bg-slate-300', border: 'border-t-slate-300' },
};

const COLUMNS: Status[] = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

const INTERVIEW_TYPE_COLORS: Record<string, string> = {
  PHONE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  VIDEO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  TECHNICAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  ONSITE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  HR: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Home() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => apiFetch<Overview>('/stats/overview'),
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => apiFetch<{ applications: Application[] }>('/applications'),
  });

  const { data: digest } = useQuery({
    queryKey: ['stats', 'digest'],
    queryFn: () => apiFetch<Digest>('/stats/digest'),
  });

  const applications = appsData?.applications ?? [];
  const upcomingInterviews = digest?.upcomingInterviews ?? [];
  const actionNeeded = applications.filter((a) => a.status === 'SAVED');

  const stats = overview
    ? [
        { label: 'Total', value: overview.totalApplications, Icon: Icons.BriefcaseBusiness },
        { label: 'Active', value: overview.activeApplications, Icon: Icons.TrendingUp },
        { label: 'Interviews', value: overview.upcomingInterviews, Icon: Icons.CalendarDays },
        { label: 'Offers', value: overview.offers, Icon: Icons.Sparkles },
      ]
    : [];

  const isLoading = overviewLoading || appsLoading;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <Button size="sm" disabled>
            Add Application
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading dashboard…</p>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(({ label, value, Icon }) => (
                <Card key={label}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs font-medium">{label}</span>
                      <span className="text-2xl font-bold tabular-nums">{value}</span>
                    </div>
                    <Icon className="text-muted-foreground size-5" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Two-column: Upcoming Interviews + Action Needed */}
            {(upcomingInterviews.length > 0 || actionNeeded.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Upcoming Interviews */}
                {upcomingInterviews.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold">Upcoming Interviews</h2>
                        <Badge variant="secondary" className="text-xs">
                          {upcomingInterviews.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {upcomingInterviews.map((interview) => (
                          <div
                            key={interview.id}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {interview.application.job.title}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {interview.application.job.company.name}
                              </p>
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                {formatDateTime(interview.scheduledAt)}
                              </p>
                            </div>
                            <Badge
                              className={
                                INTERVIEW_TYPE_COLORS[interview.type] ??
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {interview.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Needed */}
                {actionNeeded.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold">Action Needed</h2>
                        <Badge variant="secondary" className="text-xs">
                          {actionNeeded.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {actionNeeded.slice(0, 5).map((app) => (
                          <Link key={app.id} href={`/applications/${app.id}`}>
                            <div className="flex items-center justify-between gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/50">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{app.job.title}</p>
                                <p className="text-muted-foreground truncate text-xs">
                                  {app.job.company.name}
                                </p>
                              </div>
                              <Icons.ExternalLink className="text-muted-foreground size-3 flex-none" />
                            </div>
                          </Link>
                        ))}
                        {actionNeeded.length > 5 && (
                          <p className="text-muted-foreground text-xs">
                            +{actionNeeded.length - 5} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Separator />

            {/* Kanban board */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Pipeline</h2>
                {applications.length > 0 && (
                  <Link href="/board">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      View full board →
                    </Button>
                  </Link>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {COLUMNS.map((status) => {
                  const { label, dot, border } = STATUS_CONFIG[status];
                  const cards = applications.filter((a) => a.status === status);

                  return (
                    <div key={status} className="flex w-56 flex-none flex-col gap-2 sm:w-64">
                      <div className={`bg-muted/40 rounded-lg border border-t-2 px-3 py-2.5 ${border}`}>
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${dot}`} />
                          <span className="text-xs font-semibold">{label}</span>
                          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                            {cards.length}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {cards.slice(0, 3).map((app) => (
                          <Link key={app.id} href={`/applications/${app.id}`}>
                            <Card className="cursor-pointer transition-shadow hover:shadow-md">
                              <CardContent className="flex flex-col gap-1.5 p-3">
                                <span className="text-sm font-semibold leading-tight">
                                  {app.job.company.name}
                                </span>
                                <span className="text-muted-foreground text-xs leading-snug">
                                  {app.job.title}
                                </span>
                                {app.job.location && (
                                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <Icons.MapPin className="size-3 flex-none" />
                                    <span className="truncate">{app.job.location}</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        ))}

                        {cards.length === 0 ? (
                          <div className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
                            No applications
                          </div>
                        ) : cards.length > 3 ? (
                          <p className="text-muted-foreground text-center text-xs">
                            +{cards.length - 3} more
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
