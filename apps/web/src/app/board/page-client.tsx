'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { Icons } from '@/lib/icons';

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

const STATUSES = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'] as const;

const STATUS_LABELS: Record<string, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => apiFetch<{ applications: Application[] }>('/applications'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status: string }) =>
      apiFetch(`/applications/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: payload.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const applications = data?.applications ?? [];

  const columns = STATUSES.map((status) => ({
    status,
    apps: applications.filter((app) => app.status === status),
  }));

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, appId: string) => {
    setDraggedId(appId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: string) => {
    e.preventDefault();
    if (draggedId) {
      updateMutation.mutate({ id: draggedId, status });
      setDraggedId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-screen-2xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <p className="text-muted-foreground text-sm">Loading board…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader />

      <main className="flex-1 overflow-x-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex min-w-max gap-3 sm:gap-4">
          {columns.map((column) => (
            <div
              key={column.status}
              className="border-border bg-muted/50 flex w-60 flex-col rounded-lg border sm:w-80"
            >
              <div className="border-border border-b p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold sm:text-sm">{column.status}</h2>
                  <span className="text-muted-foreground bg-background rounded px-2 py-1 text-xs font-medium">
                    {column.apps.length}
                  </span>
                </div>
              </div>

              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
                className="min-h-64 flex-1 space-y-2 overflow-y-auto p-2 sm:min-h-96 sm:space-y-3 sm:p-4"
              >
                {column.apps.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground text-xs">No applications</p>
                  </div>
                ) : (
                  column.apps.map((app) => (
                    <Link key={app.id} href={`/applications/${app.id}`}>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        className={`bg-card cursor-move rounded-md border-2 border-transparent p-2 transition-shadow hover:shadow-md sm:p-3 ${
                          draggedId === app.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold sm:text-sm">
                              {app.job.title}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {app.job.company.name}
                            </p>
                            {app.job.location && (
                              <p className="text-muted-foreground truncate text-xs">
                                {app.job.location}
                              </p>
                            )}
                          </div>
                          <div className="flex-none sm:hidden">
                            <select
                              value={app.status}
                              onClick={(e) => e.preventDefault()}
                              onChange={(e) => {
                                e.preventDefault();
                                updateMutation.mutate({ id: app.id, status: e.target.value });
                              }}
                              className="bg-background text-muted-foreground border-border w-auto cursor-pointer rounded border px-1 py-0.5 text-[10px]"
                              aria-label={`Move ${app.job.title} to another status`}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
