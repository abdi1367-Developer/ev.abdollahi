/**
 * محدودیت‌های آپلود — مشترک بین فرم (کلاینت) و API (سرور).
 *
 * Vercel سقف حجم بدنه‌ی درخواست برای Serverless Functions را ۴.۵ مگابایت
 * تعیین کرده است؛ بنابراین فایل‌های تا ۴ مگابایت مستقیم به /api/convert
 * فرستاده می‌شوند و فایل‌های بزرگ‌تر (تا ۱۰ مگابایت) ابتدا با Vercel Blob
 * مستقیماً از مرورگر آپلود و سپس در سرور تبدیل می‌شوند. این کار محدودیت
 * بدنه‌ی Function را دور می‌زند.
 *
 * اگر Vercel Blob در دسترس نباشد (مثلاً اجرای محلی بدون توکن)، کلاینت همان
 * فایل را مستقیماً به /api/convert می‌فرستد؛ این مسیر تا MAX_FILE_BYTES را
 * می‌پذیرد و فقط روی Vercel برای فایل‌های بزرگ‌تر از ۴.۵ مگابایت با 413
 * محدود می‌شود.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** متن فارسی برای نمایش محدودیت حجم */
export const MAX_FILE_LABEL = '۱۰ مگابایت';

/**
 * سقف آپلود مستقیم در بدنه‌ی درخواست.
 *
 * مسیر /api/convert تا این حجم را می‌پذیرد؛ اما روی Vercel سقف بدنه‌ی
 * Serverless حدود ۴.۵ مگابایت است و درخواست‌های بزرگ‌تر پیش از رسیدن به
 * Route Handler رد می‌شوند. به همین دلیل کلاینت برای فایل‌های بزرگ‌تر از
 * BLOB_UPLOAD_THRESHOLD_BYTES ابتدا Vercel Blob را امتحان می‌کند.
 */
export const MAX_DIRECT_UPLOAD_BYTES = MAX_FILE_BYTES;

export const MAX_DIRECT_UPLOAD_LABEL = MAX_FILE_LABEL;

/** آستانه‌ی عبور از بدنه‌ی درخواست به Vercel Blob (کمی کمتر از سقف ۴.۵ مگابایتی Vercel) */
export const BLOB_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;

export const BLOB_UPLOAD_THRESHOLD_LABEL = '۴ مگابایت';

/** پیشوند مسیر فایل‌های موقت در Vercel Blob */
export const BLOB_UPLOAD_PREFIX = 'thesis-uploads/';

export const ACCEPTED_EXTENSIONS = '.docx,.pdf';

export const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];
