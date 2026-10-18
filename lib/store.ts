/**
 * ذخیره‌سازی سوابق در سرور — فقط در Route Handlerها استفاده می‌شود.
 *
 * از REST API سازگار با Upstash/Vercel KV استفاده می‌کنیم (بدون SDK اضافه).
 * اگر این متغیرها تنظیم نشده باشند، `isKvConfigured()` مقدار false می‌دهد و
 * کلاینت به‌طور خودکار سوابق را در localStorage نگه می‌دارد.
 *
 * متغیرهای پشتیبانی‌شده:
 *   KV_REST_API_URL / KV_REST_API_TOKEN              (Vercel KV)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (Upstash)
 */
import type { EvaluationRecord, HistorySummary } from './types';
import { capMarkdown, summarizeRecord } from './record';

const INDEX_KEY = 'thesis:eval:index';
const RECORD_PREFIX = 'thesis:eval:record:';
/** حداکثر رکورد نگه‌داری‌شده در فهرست (قدیمی‌ترها از ایندکس حذف می‌شوند) */
const MAX_RECORDS = 100;
const REQUEST_TIMEOUT_MS = 10000;

export class StoreError extends Error {
  status = 500;

  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
  }
}

interface KvConfig {
  url: string;
  token: string;
}

export function getKvConfig(): KvConfig | null {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url, token };
}

export function isKvConfigured(): boolean {
  return getKvConfig() !== null;
}

function recordKey(id: string): string {
  return `${RECORD_PREFIX}${id}`;
}

type RedisCommand = Array<string | number>;

async function request<T>(path: string, body: unknown): Promise<T> {
  const config = getKvConfig();
  if (!config) throw new StoreError('سرویس ذخیره‌سازی KV تنظیم نشده است.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.url}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const payload: any = await response.json().catch(() => null);
    if (!response.ok) {
      throw new StoreError(
        String(payload?.error ?? `خطای سرویس ذخیره‌سازی (کد ${response.status})`).slice(0, 200),
      );
    }
    if (payload?.error) {
      throw new StoreError(String(payload.error).slice(0, 200));
    }
    return payload as T;
  } catch (error) {
    if (error instanceof StoreError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new StoreError('سرویس ذخیره‌سازی در زمان مقرر پاسخ نداد.');
    }
    throw new StoreError('ارتباط با سرویس ذخیره‌سازی برقرار نشد.');
  } finally {
    clearTimeout(timer);
  }
}

/** اجرای یک دستور Redis و برگرداندن نتیجه (برای ماژول‌های دیگر مثل ذخیره‌ی کاربران) */
export async function redisCommand<T>(redisCommand: RedisCommand): Promise<T> {
  const payload = await request<{ result: T }>('', redisCommand);
  return payload.result;
}

/** اجرای چند دستور در یک درخواست (کاهش رفت‌وبرگشت شبکه) */
async function pipeline(commands: RedisCommand[]): Promise<unknown[]> {
  const payload = await request<Array<{ result?: unknown; error?: string }>>('/pipeline', commands);
  if (!Array.isArray(payload)) return [];
  const failed = payload.find((item) => item?.error);
  if (failed?.error) throw new StoreError(String(failed.error).slice(0, 200));
  return payload.map((item) => item?.result);
}

/** ذخیره‌ی رکورد در KV و به‌روزرسانی ایندکس */
export async function saveRecordToKv(record: EvaluationRecord): Promise<void> {
  const payload: EvaluationRecord = {
    ...record,
    markdown: capMarkdown(record.markdown),
  };

  await pipeline([
    ['SET', recordKey(record.id), JSON.stringify(payload)],
    ['LPUSH', INDEX_KEY, record.id],
    ['LTRIM', INDEX_KEY, 0, MAX_RECORDS - 1],
  ]);
}

/** خواندن یک رکورد؛ اگر نبود null */
export async function getRecordFromKv(id: string): Promise<EvaluationRecord | null> {
  const raw = await redisCommand<string | null>(['GET', recordKey(id)]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EvaluationRecord;
  } catch {
    return null;
  }
}

/** فهرست خلاصه‌ی سوابق (جدیدترین اول) */
export async function listRecordsFromKv(): Promise<HistorySummary[]> {
  const ids = await redisCommand<string[] | null>(['LRANGE', INDEX_KEY, 0, MAX_RECORDS - 1]);
  if (!Array.isArray(ids) || !ids.length) return [];

  const unique = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id)));
  if (!unique.length) return [];

  const rawValues = await redisCommand<Array<string | null>>([
    'MGET',
    ...unique.map((id) => recordKey(id)),
  ]);

  const summaries: HistorySummary[] = [];
  (rawValues ?? []).forEach((raw) => {
    if (!raw) return;
    try {
      const record = JSON.parse(raw) as EvaluationRecord;
      if (record?.id && record.report) summaries.push(summarizeRecord(record));
    } catch {
      // رکورد خراب را نادیده می‌گیریم
    }
  });

  return summaries;
}

/** حذف رکورد از KV و ایندکس */
export async function deleteRecordFromKv(id: string): Promise<void> {
  await pipeline([
    ['DEL', recordKey(id)],
    ['LREM', INDEX_KEY, 0, id],
  ]);
}
