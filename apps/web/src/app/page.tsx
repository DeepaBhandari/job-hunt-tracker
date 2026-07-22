'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AppHeader } from '@/components/app-header';
import { Icons } from '@/lib/icons';

type Status = 'SAVED' | 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

interface Application {
  id: string;
  company: string;
  title: string;
  location: string;
  appliedAt: string;
  status: Status;
}

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

const APPS: Application[] = [
  {
    id: '1',
    company: 'Stripe',
    title: 'Senior Frontend Engineer',
    location: 'Remote',
    appliedAt: 'Jun 24',
    status: 'SAVED',
  },
  {
    id: '2',
    company: 'Linear',
    title: 'Product Engineer',
    location: 'San Francisco, CA',
    appliedAt: 'Jun 23',
    status: 'SAVED',
  },
  {
    id: '3',
    company: 'Vercel',
    title: 'DX Engineer',
    location: 'Remote',
    appliedAt: 'Jun 25',
    status: 'SAVED',
  },
  {
    id: '4',
    company: 'Figma',
    title: 'Software Engineer',
    location: 'New York, NY',
    appliedAt: 'Jun 21',
    status: 'APPLIED',
  },
  {
    id: '5',
    company: 'Notion',
    title: 'Full Stack Engineer',
    location: 'Remote',
    appliedAt: 'Jun 19',
    status: 'APPLIED',
  },
  {
    id: '6',
    company: 'Anthropic',
    title: 'Software Engineer',
    location: 'San Francisco, CA',
    appliedAt: 'Jun 22',
    status: 'APPLIED',
  },
  {
    id: '7',
    company: 'GitHub',
    title: 'Senior Engineer',
    location: 'Remote',
    appliedAt: 'Jun 16',
    status: 'SCREENING',
  },
  {
    id: '8',
    company: 'Supabase',
    title: 'Frontend Engineer',
    location: 'Remote',
    appliedAt: 'Jun 18',
    status: 'SCREENING',
  },
  {
    id: '9',
    company: 'Tailwind Labs',
    title: 'Engineer',
    location: 'Remote',
    appliedAt: 'Jun 14',
    status: 'INTERVIEW',
  },
  {
    id: '10',
    company: 'PlanetScale',
    title: 'Software Engineer',
    location: 'Remote',
    appliedAt: 'Jun 17',
    status: 'INTERVIEW',
  },
  {
    id: '11',
    company: 'Railway',
    title: 'Product Engineer',
    location: 'Remote',
    appliedAt: 'Jun 11',
    status: 'OFFER',
  },
  {
    id: '12',
    company: 'Google',
    title: 'SWE L4',
    location: 'Mountain View, CA',
    appliedAt: 'Jun 6',
    status: 'REJECTED',
  },
  {
    id: '13',
    company: 'Meta',
    title: 'Production Engineer',
    location: 'Remote',
    appliedAt: 'Jun 8',
    status: 'REJECTED',
  },
  {
    id: '14',
    company: 'Amazon',
    title: 'SDE II',
    location: 'Seattle, WA',
    appliedAt: 'Jun 1',
    status: 'WITHDRAWN',
  },
];

const STATS = [
  { label: 'Total', value: APPS.length, Icon: Icons.BriefcaseBusiness },
  {
    label: 'Active',
    value: APPS.filter((a) => !['REJECTED', 'WITHDRAWN'].includes(a.status)).length,
    Icon: Icons.TrendingUp,
  },
  {
    label: 'Interviews',
    value: APPS.filter((a) => a.status === 'INTERVIEW').length,
    Icon: Icons.CalendarDays,
  },
  { label: 'Offers', value: APPS.filter((a) => a.status === 'OFFER').length, Icon: Icons.Sparkles },
];

export default function Home() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <Button size="sm" disabled>
            Add Application
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({ label, value, Icon }) => (
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

        <Separator />

        {/* Kanban board */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((status) => {
            const { label, dot, border } = STATUS_CONFIG[status];
            const cards = APPS.filter((a) => a.status === status);

            return (
              <div key={status} className="flex w-64 flex-none flex-col gap-2">
                {/* Column header */}
                <div className={`bg-muted/40 rounded-lg border border-t-2 px-3 py-2.5 ${border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${dot}`} />
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                      {cards.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2">
                  {cards.map((app) => (
                    <Card key={app.id} className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col gap-2 p-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold leading-tight">{app.company}</span>
                          <span className="text-muted-foreground text-xs leading-snug">
                            {app.title}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Icons.MapPin className="size-3 flex-none" />
                            <span className="truncate">{app.location}</span>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Icons.CalendarDays className="size-3 flex-none" />
                            <span>{app.appliedAt}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {cards.length === 0 && (
                    <div className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
                      No applications
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
