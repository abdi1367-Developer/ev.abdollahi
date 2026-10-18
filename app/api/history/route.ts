/**
 * GET  /api/history → فهرست سوابق (اگر KV تنظیم شده باشد)
 * POST /api/history → ذخیره‌ی یک رکورد کامل ارزیابی
 *
 * اگر KV تنظیم نشده باشد، این API به‌جای خطا اعلام می‌کند که ذخیره‌سازی
 * محلی است؛ در این حالت کلاینت خودش رکورد را در localStorage نگه می‌دارد.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { isKvConfigured, listRecordsFromKv, saveRecordToKv } from '@/lib/store';
import { isValidRecordId } from '@/lib/validation';
import type {
  ApiErrorResponse,
  EvaluationRecord,
  HistoryResponse,
  SaveHistoryResponse,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** حداکثر حجم رکورد برای جلوگیری از رد شدن توسط محدودیت KV */
const MAX_RECORD_BYTES = 900_000;

function isRecordLike(value: unknown): value is EvaluationRecord {
  const record = value as EvaluationRecord | null;
  if (!record || typeof record !== 'object') return false;
  if (!isValidRecordId((record as { id?: unknown }).id)) return false;
  if (typeof record.createdAt !== 'string' || Number.isNaN(Date.parse(record.createdAt))) return false;
  if (!record.meta || typeof record.meta !== 'object') return false;
  if (!record.convert || typeof record.convert !== 'object') return false;
  if (!record.analysis || typeof record.analysis !== 'object') return false;
  if (typeof record.markdown !== 'string') return false;

  const report = record.report;
  if (!report || typeof report !== 'object') return false;
  if (!Array.isArray(report.criteria) || report.criteria.length === 0 || report.criteria.length > 20) {
    return false;
  }
  if (typeof report.overall_score !== 'number' || !Number.isFinite(report.overall_score)) return false;
  if (!Array.isArray(report.top_recommendations)) return false;

  return true;
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  if (!isKvConfigured()) {
    return NextResponse.json<HistoryResponse>({
      backend: 'local',
      persistent: false,
      items: [],
    });
  }

  try {
    const items = await listRecordsFromKv();
    return NextResponse.json<HistoryResponse>({ backend: 'kv', persistent: true, items });
  } catch (error) {
    console.error('[api/history] list failed:', error);
    // خطا را به کلاینت «فقدان سوابق سروری» اعلام می‌کنیم تا از localStorage استفاده کند
    return NextResponse.json<HistoryResponse>({ backend: 'kv', persistent: false, items: [] });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>({ error: 'بدنه‌ی درخواست JSON معتبر نیست.' }, { status: 400 });
  }

  if (!isRecordLike(body)) {
    return NextResponse.json<ApiErrorResponse>({ error: 'ساختار رکورد ارسالی معتبر نیست.' }, { status: 422 });
  }

  if (!isKvConfigured()) {
    return NextResponse.json<SaveHistoryResponse>({ backend: 'local', stored: false });
  }

  try {
    const payloadSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    if (payloadSize > MAX_RECORD_BYTES) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'حجم رکورد برای ذخیره‌سازی سروری بیش از حد مجاز است.' },
        { status: 413 },
      );
    }

    await saveRecordToKv(body);
    return NextResponse.json<SaveHistoryResponse>({ backend: 'kv', stored: true });
  } catch (error) {
    console.error('[api/history] save failed:', error);
    return NextResponse.json<SaveHistoryResponse>(
      {
        backend: 'kv',
        stored: false,
        error: 'ذخیره‌سازی در سرویس سوابق ناموفق بود؛ رکورد در مرورگر نگه داشته می‌شود.',
      },
      { status: 503 },
    );
  }
}
