'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiError } from '@/lib/api';

interface ResumeGapAnalysisProps {
  jobId: string;
}

export function ResumeGapAnalysis({ jobId }: ResumeGapAnalysisProps) {
  const [resumeText, setResumeText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ analysis: string }>('/ai/resume-gap', {
        method: 'POST',
        body: JSON.stringify({ jobId, resumeText }),
      }),
    onSuccess: () => {
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to analyze resume');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume Gap Analysis</CardTitle>
        <CardDescription>
          Paste your resume text to see missing keywords and skills compared to this job.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor="resumeText">Resume text</Label>
          <textarea
            id="resumeText"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            rows={6}
          />
        </div>
        <Button
          size="sm"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending || !resumeText.trim()}
        >
          {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze'}
        </Button>
        {analyzeMutation.data && (
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm">
            {analyzeMutation.data.analysis}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
