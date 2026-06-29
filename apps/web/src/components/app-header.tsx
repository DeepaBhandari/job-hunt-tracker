'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BriefcaseBusiness, Building2, LayoutDashboard, LogOut, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/companies', label: 'Companies', Icon: Building2 },
  { href: '/jobs', label: 'Jobs', Icon: Briefcase },
];

interface AppHeaderProps {
  action?: React.ReactNode;
}

export function AppHeader({ action }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <BriefcaseBusiness className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">Job Hunt Tracker</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors',
                  pathname === href
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {action}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
