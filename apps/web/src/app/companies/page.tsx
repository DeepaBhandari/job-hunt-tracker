'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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
  website: string | null;
  industry: string | null;
  size: string | null;
  notes: string | null;
  _count: { jobs: number };
}

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiFetch<{ companies: Company[] }>('/companies'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; website?: string; industry?: string }) =>
      apiFetch<{ company: Company }>('/companies', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setName('');
      setWebsite('');
      setIndustry('');
      setShowForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create company');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/companies/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });

  const companies = data?.companies ?? [];

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <Button size="sm" onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Cancel' : 'Add Company'}
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-muted-foreground text-sm">
            Organize employers you are targeting or interviewing with.
          </p>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>New company</CardTitle>
              <CardDescription>Add a company to attach jobs and contacts later.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  createMutation.mutate({
                    name,
                    website: website || undefined,
                    industry: industry || undefined,
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
                    <Label htmlFor="company-name">Name</Label>
                    <Input
                      id="company-name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="company-website">Website</Label>
                    <Input
                      id="company-website"
                      type="url"
                      placeholder="https://"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="company-industry">Industry</Label>
                    <Input
                      id="company-industry"
                      value={industry}
                      onChange={(event) => setIndustry(event.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving…' : 'Save company'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading companies…</p>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Icons.Building2 className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">No companies yet</p>
                <p className="text-muted-foreground text-sm">
                  Add your first company to start tracking roles.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardHeader>
                  <CardTitle>{company.name}</CardTitle>
                  <CardDescription>
                    {[company.industry, company.size].filter(Boolean).join(' · ') ||
                      `${company._count.jobs} job${company._count.jobs === 1 ? '' : 's'}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="text-muted-foreground flex flex-col gap-1 text-sm">
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground inline-flex items-center gap-1 hover:underline"
                      >
                        Website
                        <Icons.ExternalLink />
                      </a>
                    )}
                    <Link href={`/jobs?companyId=${company.id}`} className="hover:underline">
                      View jobs ({company._count.jobs})
                    </Link>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(company.id)}
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
