'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiError } from '@/lib/api';

interface ResumeVersion {
  id: string;
  label: string;
  s3Key: string;
  uploadedAt: string;
}

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['resume-versions'],
    queryFn: () => apiFetch<{ resumeVersions: ResumeVersion[] }>('/resume-versions'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { label: string; s3Key: string }) =>
      apiFetch<{ resumeVersion: ResumeVersion }>('/resume-versions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-versions'] });
      setLabel('');
      setFile(null);
      setShowForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to add resume');
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; label: string }) =>
      apiFetch(`/resume-versions/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: payload.label }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-versions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/resume-versions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-versions'] });
    },
  });

  const resumeVersions = data?.resumeVersions ?? [];

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <Button
            size="sm"
            onClick={() => {
              setShowForm((value) => !value);
              setError(null);
            }}
          >
            {showForm ? 'Cancel' : 'Add Resume'}
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume Versions</h1>
          <p className="text-muted-foreground text-sm">
            Manage different versions of your resume for different roles.
          </p>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add Resume Version</CardTitle>
              <CardDescription>
                Track a new version of your resume and upload directly to S3.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!label || !file) {
                    setError('Please provide a label and select a file.');
                    return;
                  }

                  setError(null);
                  setUploading(true);

                  try {
                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
                    const key = `resumes/${Date.now()}-${safeName}`;
                    const presign = await apiFetch<{ uploadUrl: string }>('/resume-upload', {
                      method: 'POST',
                      body: JSON.stringify({
                        key,
                        contentType: file.type || 'application/pdf',
                      }),
                    });

                    await fetch(presign.uploadUrl, {
                      method: 'PUT',
                      headers: { 'Content-Type': file.type || 'application/pdf' },
                      body: file,
                    });

                    createMutation.mutate({ label, s3Key: key });
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Failed to upload file');
                    setUploading(false);
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
                  <Label htmlFor="label">Resume Label</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., SWE 2024, Generic, Startup-focused"
                    required
                    className="mt-1"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Use descriptive labels to identify which role this is for
                  </p>
                </div>
                <div>
                  <Label htmlFor="resumeFile">Resume file</Label>
                  <input
                    id="resumeFile"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-1"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Select your resume file to upload to S3.
                  </p>
                </div>
                <Button type="submit" disabled={!label || !file || uploading}>
                  {uploading ? 'Uploading...' : 'Upload resume'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading resumes…</p>
        ) : resumeVersions.length === 0 ? (
          <Alert>
            <AlertDescription>
              No resumes yet. Add your first resume version to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {resumeVersions.map((resume) => (
              <Card key={resume.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold">{resume.label}</h3>
                      <p className="text-muted-foreground mt-1 break-all font-mono text-sm">
                        {resume.s3Key}
                      </p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newLabel = prompt('New label:', resume.label);
                          if (newLabel) {
                            updateMutation.mutate({ id: resume.id, label: newLabel });
                          }
                        }}
                        disabled={updateMutation.isPending}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this resume version?')) {
                            deleteMutation.mutate(resume.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
