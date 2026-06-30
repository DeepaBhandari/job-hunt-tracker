import { Icons } from '@/lib/icons';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Icons.BriefcaseBusiness className="text-primary size-5" />
        <span className="text-sm font-semibold tracking-tight">Job Hunt Tracker</span>
      </div>
      <LoginForm />
    </div>
  );
}
