/**
 * GET    /api/history/[id] → دریافت یک رکورد کامل
 * DELETE /api/history/[id] → حذف رکورد
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { deleteRecordFromKv, getRecordFromKv, isKvConfigured } from '@/lib/store';
import { isValidRecordId } from '@/lib/validation';
import type { ApiErrorResponse, RecordResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

function fail(status: number, error: string) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const id = context?.params?.id;
  if (!isValidRecordId(id)) {
    return fail(400, 'شناسه‌ی رکورد معتبر نیست.');
  }

  if (!isKvConfigured()) {
    return fail(404, 'سوابق سروری فعال نیست؛ رکورد در مرورگر شما نگه داشته شده است.');
  }

  try {
    const record = await getRecordFromKv(id);
    if (!record) {
      return fail(404, 'رکورد موردنظر یافت نشد یا حذف شده است.');
    }
    return NextResponse.json<RecordResponse>({ backend: 'kv', record });
  } catch (error) {
    console.error('[api/history/[id]] get failed:', error);
    return fail(503, 'دریافت رکورد از سرویس سوابق ناموفق بود.');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const id = context?.params?.id;
  if (!isValidRecordId(id)) {
    return fail(400, 'شناسه‌ی رکورد معتبر نیست.');
  }

  if (!isKvConfigured()) {
    return NextResponse.json({ backend: 'local', deleted: false });
  }

  try {
    await deleteRecordFromKv(id);
    return NextResponse.json({ backend: 'kv', deleted: true });
  } catch (error) {
    console.error('[api/history/[id]] delete failed:', error);
    return fail(503, 'حذف رکورد از سرویس سوابق ناموفق بود.');
  }
}
