import { Suspense } from 'react';
import ResumesPage from './page-client';

export default function ResumesRoute() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Loading resumes…</p>}>
      <ResumesPage />
    </Suspense>
  );
}
