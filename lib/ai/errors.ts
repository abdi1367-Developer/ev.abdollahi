/** نوع خطا برای تصمیم‌گیری در زنجیره‌ی Fallback و نمایش پیام مناسب به کاربر */
export type AIErrorKind =
  | 'config'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'server'
  | 'invalid_output'
  | 'unknown';

export interface AIErrorOptions {
  kind?: AIErrorKind;
  status?: number;
  provider?: string;
  model?: string;
  detail?: string;
  /** کد HTTP دریافتی از سرویس مدل (برای ثبت در تلاش‌ها) */
  upstreamStatus?: number;
  /** فهرست تلاش‌های ناموفق (برای نمایش در پاسخ API) */
  attempts?: import('../types').AttemptRecord[];
}

/**
 * خطای لایه‌ی هوش مصنوعی.
 * `status` همان کدی است که Route Handler به کلاینت برمی‌گرداند.
 */
export class AIError extends Error {
  kind: AIErrorKind;
  status: number;
  provider?: string;
  model?: string;
  detail?: string;
  upstreamStatus?: number;
  attempts?: import('../types').AttemptRecord[];

  constructor(message: string, options: AIErrorOptions = {}) {
    super(message);
    this.name = 'AIError';
    this.kind = options.kind ?? 'unknown';
    this.status = options.status ?? 502;
    this.provider = options.provider;
    this.model = options.model;
    this.detail = options.detail;
    this.upstreamStatus = options.upstreamStatus;
    this.attempts = options.attempts;
  }
}

/** آیا این خطا ارزش تلاش دوباره با مدل بعدی را دارد؟ */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof AIError)) return true;
  if (error.kind === 'invalid_output') return true;
  if (error.kind === 'config') return false;
  return true;
}
