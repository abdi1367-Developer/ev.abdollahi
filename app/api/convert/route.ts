/**
 * POST /api/convert
 * دریافت فایل Word/PDF و برگرداندن Markdown استخراج‌شده.
 *
 * دو مسیر دارد:
 *  - multipart/form-data برای فایل‌های تا ۴ مگابایت (مستقیم و بدون ذخیره‌سازی)
 *  - application/json با blobPathname برای فایل‌های بزرگ‌تر که قبلاً با
 *    Vercel Blob مستقیماً از مرورگر آپلود شده‌اند (دور زدن سقف ۴.۵ مگابایتی
 *    بدنه‌ی Serverless Function).
 *
 * اعتبارسنجی: نوع درخواست، وجود فایل، حجم (سقف ۱۰ مگابایت) و امضای فایل.
 */
import { del, get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { ConversionError, convertFile, detectFileKind } from '@/lib/markdown';
import type { ApiErrorResponse, ConvertResponse } from '@/lib/types';
import { BLOB_UPLOAD_PREFIX, MAX_DIRECT_UPLOAD_LABEL, MAX_FILE_BYTES, MAX_FILE_LABEL } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function fail(status: number, error: string) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status });
}

async function runConversion(params: {
  buffer: Buffer;
  kind: 'docx' | 'pdf';
  fileName: string;
  fileSize: number;
}): Promise<NextResponse<ConvertResponse | ApiErrorResponse>> {
  try {
    const { markdown, info } = await convertFile(params);
    return NextResponse.json<ConvertResponse>({ markdown, info });
  } catch (error) {
    if (error instanceof ConversionError) {
      return fail(error.status, error.message);
    }
    console.error('[api/convert] unexpected error:', error);
    return fail(500, 'خطای پیش‌بینی‌نشده در تبدیل فایل رخ داد. لطفاً دوباره تلاش کنید.');
  }
}

async function safeDeleteBlob(pathname: string): Promise<void> {
  try {
    await del(pathname);
  } catch (error) {
    console.warn('[api/convert] could not delete temporary blob:', error);
  }
}

/** decodeURIComponent بدون پرتاب خطا برای مسیرهای نامعتبر */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** کد وضعیت خطای BlobError (بدون وابستگی به شکل داخلی کلاس) */
function getErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return 0;
}

async function handleMultipart(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'خواندن فایل ارسالی ناموفق بود. لطفاً دوباره تلاش کنید.');
  }

  const uploaded = form.get('file');

  if (!uploaded || typeof uploaded === 'string') {
    return fail(400, 'فایلی ارسال نشده است. یک فایل Word (.docx) یا PDF انتخاب کنید.');
  }

  const file = uploaded as File;
  if (typeof file.name !== 'string' || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function') {
    return fail(400, 'فایل ارسالی قابل خواندن نیست.');
  }

  if (file.size === 0) {
    return fail(400, 'فایل انتخاب‌شده خالی است.');
  }

  if (file.size > MAX_FILE_BYTES) {
    return fail(
      413,
      `حجم فایل ${(file.size / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت است؛ حداکثر حجم مجاز ${MAX_FILE_LABEL} است.`,
    );
  }

  const kind = detectFileKind(file.name, file.type);
  if (!kind) {
    return fail(415, 'فقط فایل‌های Word با پسوند .docx و فایل‌های PDF پشتیبانی می‌شوند.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return runConversion({ buffer, kind, fileName: file.name, fileSize: file.size });
}

async function handleBlob(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'بدنه‌ی درخواست JSON معتبر نیست.');
  }

  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const blobPathname = typeof payload.blobPathname === 'string' ? payload.blobPathname : '';
  const requestedName = typeof payload.fileName === 'string' ? payload.fileName : '';

  if (!blobPathname.startsWith(BLOB_UPLOAD_PREFIX) || blobPathname.includes('..')) {
    return fail(400, 'مسیر فایل آپلودشده نامعتبر است.');
  }

  if (requestedName && !/\.(docx|pdf)$/i.test(requestedName)) {
    return fail(415, 'فقط فایل‌های Word با پسوند .docx و فایل‌های PDF پشتیبانی می‌شوند.');
  }

  try {
    const result = await get(blobPathname, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      return fail(404, 'فایل آپلودشده پیدا نشد یا منقضی شده است. لطفاً دوباره آپلود کنید.');
    }

    const fileSize = Number(result.blob.size) || 0;
    if (fileSize <= 0) {
      await safeDeleteBlob(blobPathname);
      return fail(400, 'فایل انتخاب‌شده خالی است.');
    }
    if (fileSize > MAX_FILE_BYTES) {
      await safeDeleteBlob(blobPathname);
      return fail(
        413,
        `حجم فایل ${(fileSize / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت است؛ حداکثر حجم مجاز ${MAX_FILE_LABEL} است.`,
      );
    }

    const fileName = requestedName || safeDecode(blobPathname.split('/').pop() || '') || 'thesis-upload';
    const kind = detectFileKind(fileName, result.blob.contentType || '');
    if (!kind) {
      await safeDeleteBlob(blobPathname);
      return fail(415, 'فقط فایل‌های Word با پسوند .docx و فایل‌های PDF پشتیبانی می‌شوند.');
    }

    try {
      const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
      return await runConversion({ buffer, kind, fileName, fileSize });
    } finally {
      await safeDeleteBlob(blobPathname);
    }
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return fail(404, 'فایل آپلودشده پیدا نشد یا منقضی شده است. لطفاً دوباره آپلود کنید.');
    }
    console.error('[api/convert] blob read failed:', error);
    return fail(
      500,
      'خواندن فایل از سرویس ذخیره‌سازی ناموفق بود. اگر Vercel Blob متصل نیست، برای فایل‌های بالای ۴ مگابایت آن را از بخش Storage پروژه فعال کنید.',
    );
  }
}


export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    return handleMultipart(request);
  }
  if (contentType.includes('application/json')) {
    return handleBlob(request);
  }

  return fail(
    415,
    `درخواست باید به‌صورت multipart/form-data (تا ${MAX_DIRECT_UPLOAD_LABEL}) یا JSON (برای فایل‌های آپلودشده در Vercel Blob، تا ${MAX_FILE_LABEL}) ارسال شود.`,
  );
}
