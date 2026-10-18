/**
 * POST /api/blob/upload
 * صدور توکن آپلود مستقیم Vercel Blob برای فایل‌های بزرگ‌تر از سقف بدنه‌ی
 * Serverless Function (۴.۵ مگابایت). خود فایل از مرورگر مستقیم به Blob می‌رود
 * و درخواست به این Route فقط شامل متادیتای کوچک است.
 */
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import type { ApiErrorResponse } from '@/lib/types';
import {
  ACCEPTED_MIME_TYPES,
  BLOB_UPLOAD_PREFIX,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
} from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(status: number, error: string) {
  return NextResponse.json<ApiErrorResponse>({ error }, { status });
}

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return fail(400, 'بدنه‌ی درخواست آپلود معتبر نیست.');
  }

  // callback پایان آپلود از سمت Vercel Blob و بدون کوکی نشست می‌آید؛ چون در این
  // پروژه onUploadCompleted استفاده نمی‌شود، فقط تأیید می‌کنیم تا درخواست‌های
  // تکراری (retry) ایجاد نشود. هیچ عملیات جانبی انجام نمی‌شود.
  if (body.type === 'blob.upload-completed') {
    return NextResponse.json({ type: 'blob.upload-completed', response: 'ok' });
  }

  const auth = await requireUser(request);
  if (!auth.user) return auth.response;
  const user = auth.user;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(BLOB_UPLOAD_PREFIX)) {
          throw new Error('مسیر آپلود نامعتبر است.');
        }
        if (!/\.(docx|pdf)$/i.test(pathname)) {
          throw new Error('فقط فایل‌های Word (.docx) و PDF پشتیبانی می‌شوند.');
        }

        let declaredSize = 0;
        try {
          const payload = JSON.parse(clientPayload || '{}') as { fileSize?: unknown };
          declaredSize = Number(payload.fileSize) || 0;
        } catch {
          // clientPayload اختیاری است؛ سقف واقعی با maximumSizeInBytes اعمال می‌شود.
        }
        if (declaredSize > MAX_FILE_BYTES) {
          throw new Error(`حجم فایل نمی‌تواند بیشتر از ${MAX_FILE_LABEL} باشد.`);
        }

        // فایل بلافاصله بعد از تبدیل حذف می‌شود؛ بنابراین کش و بازنویسی لازم نیست.
        return {
          allowedContentTypes: ACCEPTED_MIME_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ uid: user.id }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('[api/blob/upload] failed:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'آپلود فایل به سرویس ذخیره‌سازی ناموفق بود.';
    return fail(400, message);
  }
}
