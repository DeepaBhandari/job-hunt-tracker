'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiFetch, ApiError } from '@/lib/api';

interface Company {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  url: string | null;
  company: Company;
}

interface ResumeVersion {
  id: string;
  label: string;
}

interface Interview {
  id: string;
  scheduledAt: string;
  type: string;
  interviewerName: string | null;
  notes: string | null;
  outcome: string | null;
}

interface Application {
  id: string;
  status: string;
  appliedAt: string | null;
  coverLetter: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  job: Job;
  resumeVersion: ResumeVersion | null;
  interviews: Interview[];
}

const STATUS_COLORS: Record<string, string> = {
  SAVED: 'bg-gray-100 text-gray-800',
  APPLIED: 'bg-blue-100 text-blue-800',
  SCREENING: 'bg-purple-100 text-purple-800',
  INTERVIEW: 'bg-yellow-100 text-yellow-800',
  OFFER: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-slate-100 text-slate-800',
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => apiFetch<{ application: Application }>(`/applications/${applicationId}`),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { status?: string; notes?: string; appliedAt?: string }) =>
      apiFetch<{ application: Application }>(`/applications/${applicationId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setEditingNotes(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/applications/${applicationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      router.push('/applications');
    },
  });

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-6 py-6">
          <p className="text-muted-foreground text-sm">Loading application…</p>
        </main>
      </div>
    );
  }

  const app = data?.application;
  if (!app) {
    return (
      <div className="bg-background flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-6 py-6">
          <Alert>
            <AlertDescription>Application not found</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const statuses = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push('/applications')}>
              Back
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                if (confirm('Delete this application?')) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{app.job.title}</h1>
            <p className="text-muted-foreground text-sm">{app.job.company.name}</p>
            {app.job.location && (
              <p className="text-muted-foreground text-sm">{app.job.location}</p>
            )}
          </div>
          <Badge className={STATUS_COLORS[app.status] || 'bg-gray-100'} size="lg">
            {app.status}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Status selector */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((s) => (
                    <Button
                      key={s}
                      variant={app.status === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        updateMutation.mutate({ status: s });
                      }}
                      disabled={updateMutation.isPending}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Application details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {app.job.salaryMin && app.job.salaryMax && (
                  <div>
                    <Label className="text-muted-foreground text-xs font-semibold">
                      SALARY RANGE
                    </Label>
                    <p className="font-semibold">
                      ${(app.job.salaryMin / 1000).toFixed(0)}k - $
                      {(app.job.salaryMax / 1000).toFixed(0)}k
                    </p>
                  </div>
                )}
                {app.appliedAt && (
                  <div>
                    <Label className="text-muted-foreground text-xs font-semibold">
                      APPLIED DATE
                    </Label>
                    <p className="font-semibold">{new Date(app.appliedAt).toLocaleDateString()}</p>
                  </div>
                )}
                {app.resumeVersion && (
                  <div>
                    <Label className="text-muted-foreground text-xs font-semibold">RESUME</Label>
                    <p className="font-semibold">{app.resumeVersion.label}</p>
                  </div>
                )}
                {app.job.url && (
                  <div>
                    <Label className="text-muted-foreground text-xs font-semibold">JOB LINK</Label>
                    <a
                      href={app.job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm text-blue-600 hover:underline"
                    >
                      View job posting →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notes</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingNotes(!editingNotes);
                      setNotes(app.notes || '');
                    }}
                  >
                    {editingNotes ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingNotes ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMutation.mutate({ notes });
                    }}
                    className="space-y-4"
                  >
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      rows={5}
                      placeholder="Add notes about this application..."
                    />
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </form>
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                    {app.notes || 'No notes yet'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Interviews */}
            <Card>
              <CardHeader>
                <CardTitle>Interviews ({app.interviews.length})</CardTitle>
                <CardDescription>Track scheduled interviews and outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                {app.interviews.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No interviews scheduled yet.</p>
                ) : (
                  <div className="space-y-4">
                    {app.interviews.map((interview) => (
                      <div key={interview.id} className="rounded border p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{interview.type}</p>
                            <p className="text-muted-foreground text-sm">
                              {new Date(interview.scheduledAt).toLocaleDateString()}
                            </p>
                            {interview.interviewerName && (
                              <p className="text-sm">{interview.interviewerName}</p>
                            )}
                          </div>
                          {interview.outcome && (
                            <Badge variant="outline">{interview.outcome}</Badge>
                          )}
                        </div>
                        {interview.notes && (
                          <p className="text-muted-foreground mt-2 text-sm">{interview.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(app.createdAt).toLocaleDateString()}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Last updated</p>
                  <p>{new Date(app.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
