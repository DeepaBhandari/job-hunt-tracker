'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { apiFetch, ApiError } from '@/lib/api';

interface Interview {
  id: string;
  scheduledAt: string;
  type: string;
  interviewerName: string | null;
  notes: string | null;
  outcome: string | null;
}

interface InterviewFormProps {
  applicationId: string;
}

export function InterviewForm({ applicationId }: InterviewFormProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [type, setType] = useState('PHONE');
  const [interviewerName, setInterviewerName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prepByInterviewId, setPrepByInterviewId] = useState<Record<string, string>>({});

  const { data: applicationData } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () =>
      apiFetch<{ application: { interviews: Interview[] } }>(`/applications/${applicationId}`),
  });

  const interviews = applicationData?.application?.interviews ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: {
      applicationId: string;
      scheduledAt: string;
      type: string;
      interviewerName?: string;
      notes?: string;
    }) =>
      apiFetch<{ interview: Interview }>('/interviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setScheduledAt('');
      setType('PHONE');
      setInterviewerName('');
      setNotes('');
      setShowForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create interview');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/interviews/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });

  const prepMutation = useMutation({
    mutationFn: (interview: Interview) =>
      apiFetch<{ prep: string }>('/ai/interview-prep', {
        method: 'POST',
        body: JSON.stringify({ applicationId, stage: interview.type }),
      }).then((res) => ({ interviewId: interview.id, prep: res.prep })),
    onSuccess: ({ interviewId, prep }) => {
      setPrepByInterviewId((prev) => ({ ...prev, [interviewId]: prep }));
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to generate interview prep');
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interviews</CardTitle>
            <CardDescription>Schedule and track interviews</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowForm(!showForm);
              setError(null);
            }}
          >
            {showForm ? 'Cancel' : 'Schedule Interview'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (scheduledAt && type) {
                createMutation.mutate({
                  applicationId,
                  scheduledAt,
                  type,
                  interviewerName: interviewerName || undefined,
                  notes: notes || undefined,
                });
              }
            }}
            className="space-y-4 border-b pb-6"
          >
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="scheduledAt">Date & Time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="type">Interview Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="PHONE">Phone</option>
                <option value="VIDEO">Video</option>
                <option value="TECHNICAL">Technical</option>
                <option value="ONSITE">On-site</option>
                <option value="HR">HR</option>
              </select>
            </div>
            <div>
              <Label htmlFor="interviewerName">Interviewer Name (optional)</Label>
              <Input
                id="interviewerName"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="e.g., John Smith"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preparation notes, topics to discuss, etc."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending || !scheduledAt}>
              {createMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </form>
        )}

        {interviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No interviews scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div key={interview.id} className="rounded border bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {interview.type}
                      </Badge>
                      {interview.outcome && (
                        <Badge variant="secondary" className="text-xs">
                          {interview.outcome}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold">
                      {new Date(interview.scheduledAt).toLocaleString()}
                    </p>
                    {interview.interviewerName && (
                      <p className="text-muted-foreground text-xs">{interview.interviewerName}</p>
                    )}
                    {interview.notes && (
                      <p className="text-muted-foreground mt-1 text-xs">{interview.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => prepMutation.mutate(interview)}
                      disabled={prepMutation.isPending}
                    >
                      {prepMutation.isPending && prepMutation.variables?.id === interview.id
                        ? 'Generating...'
                        : 'Generate Prep'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this interview?')) {
                          deleteMutation.mutate(interview.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {prepByInterviewId[interview.id] && (
                  <p className="text-muted-foreground mt-3 whitespace-pre-wrap rounded border bg-white p-3 text-xs">
                    {prepByInterviewId[interview.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
