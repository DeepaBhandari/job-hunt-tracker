'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { apiFetch, ApiError } from '@/lib/api';

interface Company {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
}

interface ResumeVersion {
  id: string;
  label: string;
}

interface Application {
  id: string;
  status: string;
  appliedAt: string | null;
  coverLetter: string | null;
  notes: string | null;
  job: Job & { company: Company };
  resumeVersion: ResumeVersion | null;
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

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [jobId, setJobId] = useState('');
  const [resumeVersionId, setResumeVersionId] = useState('');
  const [status, setStatus] = useState('SAVED');
  const [error, setError] = useState<string | null>(null);

  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiFetch<{ jobs: Job[] }>('/jobs'),
  });

  const { data: resumeData } = useQuery({
    queryKey: ['resume-versions'],
    queryFn: () => apiFetch<{ resumeVersions: ResumeVersion[] }>('/resume-versions'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['applications', selectedStatus],
    queryFn: () =>
      apiFetch<{ applications: Application[] }>(
        selectedStatus ? `/applications?status=${selectedStatus}` : '/applications'
      ),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { jobId: string; resumeVersionId?: string; status: string }) =>
      apiFetch<{ application: Application }>('/applications', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setJobId('');
      setResumeVersionId('');
      setStatus('SAVED');
      setShowForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create application');
    },
  });

  const jobs = jobsData?.jobs ?? [];
  const applications = data?.applications ?? [];

  const statuses = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <Button
            size="sm"
            onClick={() => {
              setShowForm((value) => !value);
            }}
            disabled={jobs.length === 0}
          >
            {showForm ? 'Cancel' : 'Track Application'}
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-muted-foreground text-sm">
            Track your job applications through the pipeline.
          </p>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Track New Application</CardTitle>
              <CardDescription>Create a new application entry</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (jobId) {
                    createMutation.mutate({
                      jobId,
                      resumeVersionId: resumeVersionId || undefined,
                      status,
                    });
                  }
                }}
                className="space-y-4"
              >
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label htmlFor="job">Job</Label>
                  <select
                    id="job"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select a job</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
                {resumeData?.resumeVersions?.length ? (
                  <div>
                    <Label htmlFor="resumeVersion">Resume Version</Label>
                    <select
                      id="resumeVersion"
                      value={resumeVersionId}
                      onChange={(e) => setResumeVersionId(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {resumeData.resumeVersions.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="status">Initial Status</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={!jobId || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedStatus === null ? 'default' : 'outline'}
            onClick={() => setSelectedStatus(null)}
            size="sm"
          >
            All
          </Button>
          {statuses.map((s) => (
            <Button
              key={s}
              variant={selectedStatus === s ? 'default' : 'outline'}
              onClick={() => setSelectedStatus(s)}
              size="sm"
            >
              {s}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading applications…</p>
        ) : applications.length === 0 ? (
          <Alert>
            <AlertDescription>
              {selectedStatus
                ? `No applications with status "${selectedStatus}"`
                : 'No applications yet. Create one to get started.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold">{app.job.title}</h3>
                        <p className="text-muted-foreground text-sm">{app.job.company.name}</p>
                        {app.job.location && (
                          <p className="text-muted-foreground text-sm">{app.job.location}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={STATUS_COLORS[app.status] || 'bg-gray-100'}>
                          {app.status}
                        </Badge>
                        {app.appliedAt && (
                          <p className="text-muted-foreground text-xs">
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
