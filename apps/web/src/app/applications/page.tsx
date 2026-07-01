import { Suspense } from 'react';
import ApplicationsPage from './page-client';

export default function ApplicationsRoute() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Loading applications…</p>}>
      <ApplicationsPage />
    </Suspense>
  );
}
