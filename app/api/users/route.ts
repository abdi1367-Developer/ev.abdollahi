/**
 * GET  /api/users → فهرست کاربران (فقط مدیر)
 * POST /api/users → ساخت کاربر جدید (فقط مدیر)
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import type { ApiErrorResponse, AuthResponse, UsersResponse } from '@/lib/types';
import { createUser, listUsers, UserStoreError } from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  try {
    return NextResponse.json<UsersResponse>({ users: await listUsers() });
  } catch (error) {
    if (error instanceof UserStoreError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[api/users] list failed:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'دریافت فهرست کاربران ناموفق بود.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

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

  try {
    const user = await createUser({
      username: data.username,
      displayName: data.displayName,
      password: data.password,
      role: data.role,
    });
    return NextResponse.json<AuthResponse>({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof UserStoreError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[api/users] create failed:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'ساخت کاربر جدید ناموفق بود.' },
      { status: 500 },
    );
  }
}
