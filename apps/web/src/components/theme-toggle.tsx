'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icons } from '@/lib/icons';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span aria-hidden className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))} />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Icons.Sun /> : <Icons.Moon />}
    </Button>
  );
}
