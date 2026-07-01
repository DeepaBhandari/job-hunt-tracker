import { Suspense } from 'react';
import ContactsPage from './page-client';

export default function ContactsRoute() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Loading contacts…</p>}>
      <ContactsPage />
    </Suspense>
  );
}
