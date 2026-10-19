/**
 * ذخیره‌سازی «حالت ارزیابی» انتخاب‌شده در مرورگر.
 * فقط یک ترجیح شخصی است؛ سرور همیشه حالت را اعتبارسنجی می‌کند و
 * برای حالت نامعتبر، «متعادل» را در نظر می‌گیرد.
 */
import { DEFAULT_EVALUATION_MODE, normalizeEvaluationMode } from './evaluation-mode';
import type { EvaluationMode } from './types';

const STORAGE_KEY = 'thesis-evaluator:evaluation-mode:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readSelectedEvaluationMode(): EvaluationMode {
  if (!isBrowser()) return DEFAULT_EVALUATION_MODE;
  try {
    return normalizeEvaluationMode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_EVALUATION_MODE;
  }
}

export function writeSelectedEvaluationMode(mode: EvaluationMode): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // نادیده گرفتن خطای ذخیره‌سازی
  }
}
