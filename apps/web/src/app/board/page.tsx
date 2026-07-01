import { Suspense } from 'react';
import KanbanPage from './page-client';

export default function BoardRoute() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Loading board…</p>}>
      <KanbanPage />
    </Suspense>
  );
}
