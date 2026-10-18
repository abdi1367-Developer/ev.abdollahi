/**
 * POST /api/convert
 * دریافت فایل Word/PDF و برگرداندن Markdown استخراج‌شده.
 * اعتبارسنجی: نوع درخواست، وجود فایل، حجم (سقف پلتفرم) و امضای فایل.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { ConversionError, convertFile, detectFileKind } from '@/lib/markdown';
import type { ApiErrorResponse, ConvertResponse } from '@/lib/types';
import { MAX_FILE_BYTES, MAX_FILE_LABEL } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function fail(status: number, error: string) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return fail(415, 'درخواست باید به‌صورت multipart/form-data و همراه فایل ارسال شود.');
  }

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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { markdown, info } = await convertFile({
      buffer,
      kind,
      fileName: file.name,
      fileSize: file.size,
    });

    return NextResponse.json<ConvertResponse>({ markdown, info });
  } catch (error) {
    if (error instanceof ConversionError) {
      return fail(error.status, error.message);
    }
    console.error('[api/convert] unexpected error:', error);
    return fail(500, 'خطای پیش‌بینی‌نشده در تبدیل فایل رخ داد. لطفاً دوباره تلاش کنید.');
  }
}
