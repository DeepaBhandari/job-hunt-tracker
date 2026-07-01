import { Suspense } from 'react';
import ApplicationDetailPage from './page-client';

export default function ApplicationDetailRoute() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Loading…</p>}>
      <ApplicationDetailPage />
    </Suspense>
  );
}
