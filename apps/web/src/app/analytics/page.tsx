import { Suspense } from 'react';
import AnalyticsPage from './page-client';

export default function AnalyticsRoute() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Loading analytics…</p>}>
      <AnalyticsPage />
    </Suspense>
  );
}
