/**
 * ابزارهای مشترک رکورد ارزیابی (کلاینت و سرور).
 */
import type { EvaluationRecord, HistorySummary } from './types';

/**
 * حداکثر طول متنی که از Markdown در سوابق نگه داشته می‌شود.
 * متن کامل پایان‌نامه ممکن است چند مگابایت باشد؛ ذخیره‌ی بی‌قید آن
 * هم محدودیت KV را رد می‌کند و هم حافظه‌ی مرورگر را پر می‌کند.
 */
export const MAX_STORED_MARKDOWN = 300_000;

export const MAX_STORED_RECORDS = 20;

export function capMarkdown(markdown: string): string {
  const text = String(markdown ?? '');
  if (text.length <= MAX_STORED_MARKDOWN) return text;
  return `${text.slice(0, MAX_STORED_MARKDOWN)}\n\n> [نسخه‌ی ذخیره‌شده در سوابق به دلیل حجم زیاد کوتاه شده است.]`;
}

/** خلاصه‌ی رکورد برای لیست سوابق */
export function summarizeRecord(record: EvaluationRecord): HistorySummary {
  return {
    id: record.id,
    createdAt: record.createdAt,
    meta: record.meta,
    overall_score: record.report.overall_score,
    provider: record.analysis.provider,
    model: record.analysis.model,
    fileType: record.convert.fileType,
    templateName: record.template?.name,
    mode: record.report.mode ?? record.mode,
    criteria: record.report.criteria.map((criterion) => ({
      name: criterion.name,
      score: Number(criterion.score) || 0,
      weight: Number(criterion.weight) || 0,
    })),
  };
}

/** مرتب‌سازی نزولی بر اساس تاریخ ایجاد */
export function sortByNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const first = new Date(a.createdAt).getTime();
    const second = new Date(b.createdAt).getTime();
    return (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0);
  });
}
