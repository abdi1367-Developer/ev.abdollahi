/**
 * PATCH  /api/users/[id] → ویرایش نقش/وضعیت/نام/رمز (فقط مدیر)
 * DELETE /api/users/[id] → حذف کاربر (فقط مدیر)
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import type { ApiErrorResponse, AuthResponse } from '@/lib/types';
import { deleteUser, updateUser, UserStoreError } from '@/lib/users';
import { isValidRecordId } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

function fail(status: number, error: string) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const id = context?.params?.id;
  if (!isValidRecordId(id)) return fail(400, 'شناسه‌ی کاربر معتبر نیست.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'بدنه‌ی درخواست JSON معتبر نیست.');
  }

  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  try {
    const user = await updateUser(
      id,
      {
        displayName: data.displayName,
        role: data.role,
        active: data.active,
        password: data.password,
      },
      auth.user.id,
    );
    return NextResponse.json<AuthResponse>({ user });
  } catch (error) {
    if (error instanceof UserStoreError) return fail(error.status, error.message);
    console.error('[api/users/[id]] update failed:', error);
    return fail(500, 'ویرایش کاربر ناموفق بود.');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const id = context?.params?.id;
  if (!isValidRecordId(id)) return fail(400, 'شناسه‌ی کاربر معتبر نیست.');

  try {
    await deleteUser(id, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserStoreError) return fail(error.status, error.message);
    console.error('[api/users/[id]] delete failed:', error);
    return fail(500, 'حذف کاربر ناموفق بود.');
  }
}
