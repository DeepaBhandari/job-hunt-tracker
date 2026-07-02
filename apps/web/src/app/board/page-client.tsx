'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
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

const STATUSES = ['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];

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
        <main className="max-w-screen-full mx-auto flex w-full flex-1 px-6 py-6">
          <p className="text-muted-foreground text-sm">Loading board…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader />

      <main className="flex-1 overflow-x-auto px-6 py-6">
        <div className="flex min-w-max gap-4">
          {columns.map((column) => (
            <div
              key={column.status}
              className="flex w-80 flex-col rounded-lg border border-gray-200 bg-gray-50"
            >
              {/* Column header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{column.status}</h2>
                  <span className="text-muted-foreground rounded bg-white px-2 py-1 text-xs font-medium">
                    {column.apps.length}
                  </span>
                </div>
              </div>

              {/* Cards area */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
                className="min-h-96 flex-1 space-y-3 overflow-y-auto p-4"
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
                        className={`cursor-move rounded-md border-2 border-transparent bg-white p-3 transition-shadow hover:shadow-md ${
                          draggedId === app.id ? 'opacity-50' : ''
                        }`}
                      >
                        <p className="truncate text-sm font-semibold">{app.job.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {app.job.company.name}
                        </p>
                        {app.job.location && (
                          <p className="text-muted-foreground text-xs">{app.job.location}</p>
                        )}
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
