/** PATCH /api/auth/password — تغییر رمز عبور حساب جاری */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import type { ApiErrorResponse } from '@/lib/types';
import { authenticate, updateUser, UserStoreError } from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
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
  const currentPassword = typeof data.currentPassword === 'string' ? data.currentPassword : '';
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'رمز فعلی و رمز جدید را وارد کنید.' },
      { status: 400 },
    );
  }

  try {
    const verified = await authenticate(auth.user.username, currentPassword);
    if (!verified) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'رمز عبور فعلی نادرست است.' },
        { status: 401 },
      );
    }

    await updateUser(auth.user.id, { password: newPassword }, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserStoreError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[api/auth/password] failed:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'تغییر رمز عبور ناموفق بود.' },
      { status: 500 },
    );
  }
}
