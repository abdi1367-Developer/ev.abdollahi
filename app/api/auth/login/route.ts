/** POST /api/auth/login — ورود با نام کاربری و رمز عبور */
import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isSecureRequest,
  sessionCookieOptions,
} from '@/lib/session';
import type { ApiErrorResponse, AuthResponse } from '@/lib/types';
import { authenticate } from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Attempt {
  count: number;
  resetAt: number;
}

const memory = globalThis as unknown as { __thesisLoginAttempts?: Map<string, Attempt> };
const attempts = (memory.__thesisLoginAttempts ??= new Map<string, Attempt>());
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function clientKey(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  );
}

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

function resetAttempts(key: string): void {
  attempts.delete(key);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'بدنه‌ی درخواست JSON معتبر نیست.' },
      { status: 400 },
    );
  }

  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const username = typeof data.username === 'string' ? data.username : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!username.trim() || !password) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'نام کاربری و رمز عبور را وارد کنید.' },
      { status: 400 },
    );
  }

  const key = clientKey(request);
  if (tooManyAttempts(key)) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'تعداد تلاش‌های ورود بیش از حد مجاز است؛ چند دقیقه بعد دوباره تلاش کنید.' },
      { status: 429 },
    );
  }

  try {
    const user = await authenticate(username, password);
    if (!user) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'نام کاربری یا رمز عبور نادرست است.' },
        { status: 401 },
      );
    }

    resetAttempts(key);
    const token = await createSessionToken({
      uid: user.id,
      role: user.role,
      username: user.username,
      displayName: user.displayName,
      maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
    });
    const response = NextResponse.json<AuthResponse>({ user });
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_MAX_AGE_SECONDS, { secure: isSecureRequest(request) }),
    );
    return response;
  } catch (error) {
    console.error('[api/auth/login] failed:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'ورود به سامانه ناموفق بود. تنظیمات ذخیره‌سازی کاربران را بررسی کنید.' },
      { status: 500 },
    );
  }
}
