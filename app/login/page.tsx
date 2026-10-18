import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'ورود به سامانه',
  description: 'ورود به ارزیاب هوشمند پایان‌نامه',
};

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams?: { next?: string | string[] };
}

function safeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '/';
  const trimmed = candidate.slice(0, 500);
  const pathOnly = trimmed.split(/[?#]/)[0];
  // بازگشت به صفحه‌ی ورود یا مسیرهای API باعث حلقه‌ی ریدایرکت می‌شود.
  if (pathOnly === '/login' || pathOnly.startsWith('/login/')) return '/';
  if (pathOnly.startsWith('/api/')) return '/';
  return trimmed;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <LoginForm nextPath={safeNextPath(searchParams?.next)} />;
}
