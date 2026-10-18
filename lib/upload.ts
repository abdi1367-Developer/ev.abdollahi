/**
 * محدودیت‌های آپلود — مشترک بین فرم (کلاینت) و API (سرور).
 *
 * چرا ۴ مگابایت؟ Vercel سقف حجم بدنه‌ی درخواست برای Serverless Functions را
 * ۴.۵ مگابایت تعیین کرده است. فایل بزرگ‌تر در همان لایه‌ی شبکه رد می‌شود،
 * بنابراین محدودیت را عمداً کمی کمتر از سقف پلتفرم گذاشته‌ایم تا پیام خطای
 * ما (و نه خطای مبهم پلتفرم) به کاربر نشان داده شود.
 */

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** متن فارسی برای نمایش محدودیت حجم */
export const MAX_FILE_LABEL = '۴ مگابایت';

export const ACCEPTED_EXTENSIONS = '.docx,.pdf';

export const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];
