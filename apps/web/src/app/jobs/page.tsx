import { Suspense } from 'react';
import JobsPage from './page-client';

export default function JobsRoute() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Loading jobs…</p>}>
      <JobsPage />
    </Suspense>
  );
}
