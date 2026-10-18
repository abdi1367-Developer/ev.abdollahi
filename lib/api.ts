/** کمک‌کننده‌های کوچک برای کار با پاسخ‌های API در سمت کلاینت */
import type { ApiErrorResponse } from './types';

export async function readJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** استخراج پیام خطا از پاسخ API (با پیام پیش‌فرض) */
export function getApiError(payload: unknown, fallback: string): string {
  const message = (payload as ApiErrorResponse | null)?.error;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

/** خطاهای فیلد‌به‌فیلد فرم (مثلاً اعتبارسنجی سمت سرور) */
export function getFieldErrors(payload: unknown): Record<string, string> {
  const fieldErrors = (payload as ApiErrorResponse | null)?.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== 'object') return {};
  return fieldErrors;
}
