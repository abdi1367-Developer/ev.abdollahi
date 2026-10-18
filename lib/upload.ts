/**
 * محدودیت‌های آپلود — مشترک بین فرم (کلاینت) و API (سرور).
 *
 * Vercel سقف حجم بدنه‌ی درخواست برای Serverless Functions را ۴.۵ مگابایت
 * تعیین کرده است؛ بنابراین فایل‌های تا ۴ مگابایت مستقیم به /api/convert
 * فرستاده می‌شوند و فایل‌های بزرگ‌تر (تا ۱۰ مگابایت) ابتدا با Vercel Blob
 * مستقیماً از مرورگر آپلود و سپس در سرور تبدیل می‌شوند. این کار محدودیت
 * بدنه‌ی Function را دور می‌زند.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** متن فارسی برای نمایش محدودیت حجم */
export const MAX_FILE_LABEL = '۱۰ مگابایت';

/** سقف آپلود مستقیم در بدنه‌ی درخواست (کمی کمتر از سقف ۴.۵ مگابایتی Vercel) */
export const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;

export const MAX_DIRECT_UPLOAD_LABEL = '۴ مگابایت';

/** پیشوند مسیر فایل‌های موقت در Vercel Blob */
export const BLOB_UPLOAD_PREFIX = 'thesis-uploads/';

export const ACCEPTED_EXTENSIONS = '.docx,.pdf';

export const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];
