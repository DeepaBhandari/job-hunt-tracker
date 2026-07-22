'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiError } from '@/lib/api';

interface Company {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  notes: string | null;
  company: Company;
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiFetch<{ companies: Company[] }>('/companies'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', selectedCompanyFilter],
    queryFn: () =>
      apiFetch<{ contacts: Contact[] }>(
        selectedCompanyFilter ? `/contacts?companyId=${selectedCompanyFilter}` : '/contacts'
      ),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      companyId: string;
      name: string;
      role?: string;
      email?: string;
      linkedinUrl?: string;
      notes?: string;
    }) =>
      apiFetch<{ contact: Contact }>('/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setName('');
      setRole('');
      setEmail('');
      setLinkedinUrl('');
      setNotes('');
      setCompanyId('');
      setShowForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create contact');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/contacts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const companies = companiesData?.companies ?? [];
  const contacts = data?.contacts ?? [];

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader
        action={
          <Button
            size="sm"
            onClick={() => {
              setShowForm((value) => !value);
            }}
            disabled={companies.length === 0}
          >
            {showForm ? 'Cancel' : 'Add Contact'}
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground text-sm">
            Keep track of your professional contacts at each company.
          </p>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Contact</CardTitle>
              <CardDescription>Track people you have met or want to connect with</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (companyId && name) {
                    createMutation.mutate({
                      companyId,
                      name,
                      role: role || undefined,
                      email: email || undefined,
                      linkedinUrl: linkedinUrl || undefined,
                      notes: notes || undefined,
                    });
                  }
                }}
                className="space-y-4"
              >
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label htmlFor="company">Company</Label>
                  <select
                    id="company"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role (optional)</Label>
                    <Input
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g., Hiring Manager, Recruiter"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn URL (optional)</Label>
                    <Input
                      id="linkedin"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Conversation notes, interests, etc."
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={!companyId || !name || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Add Contact'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Company filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCompanyFilter === null ? 'default' : 'outline'}
            onClick={() => setSelectedCompanyFilter(null)}
            size="sm"
          >
            All
          </Button>
          {companies.map((company) => (
            <Button
              key={company.id}
              variant={selectedCompanyFilter === company.id ? 'default' : 'outline'}
              onClick={() => setSelectedCompanyFilter(company.id)}
              size="sm"
            >
              {company.name}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading contacts…</p>
        ) : contacts.length === 0 ? (
          <Alert>
            <AlertDescription>
              {selectedCompanyFilter
                ? 'No contacts for this company'
                : 'No contacts yet. Add one to get started.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold">{contact.name}</h3>
                      <p className="text-muted-foreground text-sm">{contact.company.name}</p>
                      {contact.role && (
                        <p className="text-muted-foreground text-sm">{contact.role}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Email
                          </a>
                        )}
                        {contact.linkedinUrl && (
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                      </div>
                      {contact.notes && (
                        <p className="text-muted-foreground mt-2 text-sm">{contact.notes}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this contact?')) {
                          deleteMutation.mutate(contact.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
