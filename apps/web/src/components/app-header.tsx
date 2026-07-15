'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Dashboard', Icon: Icons.LayoutDashboard },
  { href: '/companies', label: 'Companies', Icon: Icons.Building2 },
  { href: '/jobs', label: 'Jobs', Icon: Icons.Briefcase },
  { href: '/analytics', label: 'Analytics', Icon: Icons.BarChart3 },
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
    <header className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Icons.BriefcaseBusiness className="text-primary size-5 shrink-0" />
            <span className="truncate text-sm font-semibold tracking-tight">Job Hunt Tracker</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors',
                  pathname === href
                    ? 'bg-muted text-foreground font-medium'
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
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <Icons.LogOut data-icon="inline-start" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
