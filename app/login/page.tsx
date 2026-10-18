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
  return candidate.slice(0, 500);
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <LoginForm nextPath={safeNextPath(searchParams?.next)} />;
}
