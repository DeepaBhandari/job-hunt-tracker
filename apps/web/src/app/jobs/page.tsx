import { Suspense } from 'react';
import JobsPage from './page-client';

export default function JobsRoute() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading jobs…</p>}>
      <JobsPage />
    </Suspense>
  );
}
