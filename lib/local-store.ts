/**
 * ذخیره‌سازی سوابق در مرورگر (localStorage) — فقط سمت کلاینت.
 * این لایه زمانی فعال می‌شود که KV روی سرور تنظیم نشده باشد.
 *
 * محدودیت‌ها (در README هم توضیح داده شده):
 *  - سوابق فقط روی همین مرورگر و همین دستگاه باقی می‌مانند.
 *  - پاک کردن داده‌های مرورگر، سوابق را حذف می‌کند.
 *  - حجم کل محدود است؛ بنابراین تعداد رکوردها و طول متن ذخیره‌شده کنترل می‌شود.
 */
import type { EvaluationRecord, HistorySummary } from './types';
import { MAX_STORED_RECORDS, capMarkdown, sortByNewest, summarizeRecord } from './record';

const STORAGE_KEY = 'thesis-evaluator:records:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseRecords(raw: string | null): EvaluationRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is EvaluationRecord =>
        Boolean(item && typeof item === 'object' && item.id && item.report && item.meta),
    );
  } catch {
    return [];
  }
}

/** خواندن همه‌ی رکوردهای مرورگر (جدیدترین اول) */
export function readLocalRecords(): EvaluationRecord[] {
  if (!isBrowser()) return [];
  try {
    return sortByNewest(parseRecords(window.localStorage.getItem(STORAGE_KEY)));
  } catch {
    return [];
  }
}

export function readLocalSummaries(): HistorySummary[] {
  return readLocalRecords().map(summarizeRecord);
}

export function getLocalRecord(id: string): EvaluationRecord | null {
  return readLocalRecords().find((record) => record.id === id) ?? null;
}

/**
 * ذخیره‌ی رکورد در مرورگر.
 * در صورت پر شدن فضای localStorage، قدیمی‌ترین رکوردها حذف و دوباره تلاش می‌شود.
 */
export function saveLocalRecord(record: EvaluationRecord): boolean {
  if (!isBrowser()) return false;

  const prepared: EvaluationRecord = {
    ...record,
    markdown: capMarkdown(record.markdown),
  };

  let records = readLocalRecords().filter((item) => item.id !== prepared.id);
  records.unshift(prepared);

  while (records.length > 1) {
    records = records.slice(0, MAX_STORED_RECORDS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch {
      // فضای ذخیره‌سازی پر است؛ قدیمی‌ترین رکورد را حذف می‌کنیم
      records = records.slice(0, records.length - 1);
    }
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return records.length > 0;
  } catch {
    return false;
  }
}

export function deleteLocalRecord(id: string): void {
  if (!isBrowser()) return;
  try {
    const remaining = readLocalRecords().filter((record) => record.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // نادیده گرفتن خطای ذخیره‌سازی
  }
}

export function clearLocalRecords(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // نادیده گرفتن
  }
}
