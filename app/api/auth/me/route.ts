/** GET /api/auth/me — اطلاعات کاربر جاری */
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import type { ApiErrorResponse, AuthResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'برای دسترسی باید وارد حساب کاربری شوید.' },
      { status: 401 },
    );
  }
  return NextResponse.json<AuthResponse>({ user });
}
