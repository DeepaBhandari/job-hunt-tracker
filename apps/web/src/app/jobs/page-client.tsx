'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiError } from '@/lib/api';

interface Company {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
  url: string | null;
  type: string | null;
  source: string | null;
  company: Company;
}

export default function JobsPage() {
  const searchParams = useSearchParams();
  const companyIdFilter = searchParams.get('companyId') ?? '';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState(companyIdFilter);
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiFetch<{ companies: Company[] }>('/companies'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', companyIdFilter],
    queryFn: () =>
      apiFetch<{ jobs: Job[] }>(companyIdFilter ? `/jobs?companyId=${companyIdFilter}` : '/jobs'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { companyId: string; title: string; location?: string; url?: string }) =>
      apiFetch<{ job: Job }>('/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setTitle('');
      setLocation('');
      setUrl('');
      setShowForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create job');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/jobs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const companies = companiesData?.companies ?? [];
  const jobs = data?.jobs ?? [];

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <Button
            size="sm"
            onClick={() => {
              setShowForm((value) => !value);
              if (!companyId && companyIdFilter) setCompanyId(companyIdFilter);
            }}
            disabled={companies.length === 0}
          >
            {showForm ? 'Cancel' : 'Add Job'}
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground text-sm">
            Track open roles before you turn them into applications.
          </p>
        </div>

        {companies.length === 0 && (
          <Alert>
            <AlertDescription>Add a company first before creating jobs.</AlertDescription>
          </Alert>
        )}

        {showForm && companies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>New job</CardTitle>
              <CardDescription>Link a role to one of your companies.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  createMutation.mutate({
                    companyId,
                    title,
                    location: location || undefined,
                    url: url || undefined,
                  });
                }}
              >
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="job-company">Company</Label>
                    <select
                      id="job-company"
                      required
                      value={companyId}
                      onChange={(event) => setCompanyId(event.target.value)}
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 flex h-8 w-full rounded-lg border px-2.5 text-sm outline-none"
                    >
                      <option value="" disabled>
                        Select a company
                      </option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="job-title">Title</Label>
                    <Input
                      id="job-title"
                      required
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="job-location">Location</Label>
                    <Input
                      id="job-location"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="job-url">Posting URL</Label>
                    <Input
                      id="job-url"
                      type="url"
                      placeholder="https://"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving…' : 'Save job'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Icons.Briefcase className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">No jobs yet</p>
                <p className="text-muted-foreground text-sm">
                  Save roles you want to apply to and track them here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-muted-foreground text-sm">{job.company.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {[job.location, job.type, job.source].filter(Boolean).join(' · ')}
                    </p>
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm hover:underline"
                      >
                        View posting
                        <Icons.ExternalLink />
                      </a>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(job.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Icons.Trash2 />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
