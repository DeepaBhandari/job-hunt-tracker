import { BriefcaseBusiness } from 'lucide-react';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="mb-8 flex items-center gap-2">
        <BriefcaseBusiness className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Job Hunt Tracker</span>
      </div>
      <RegisterForm />
    </div>
  );
}
