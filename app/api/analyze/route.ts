/**
 * POST /api/analyze
 * بدنه: { markdown: string, meta: ThesisMeta, instructions?: string }
 * خروجی: گزارش ارزیابی + اطلاعات مدل و تلاش‌ها.
 */
import { NextResponse } from 'next/server';
import { analyzeThesis } from '@/lib/ai/analyze';
import { requireUser } from '@/lib/auth-server';
import { AIError } from '@/lib/ai/errors';
import { resolveTemplateInput, toTemplateSnapshot } from '@/lib/templates';
import type { AnalyzeResponse, ApiErrorResponse } from '@/lib/types';
import { cleanMultiline, validateThesisMeta } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** سقف متن ورودی (پیش از فشرده‌سازی) برای جلوگیری از درخواست‌های سنگین */
const MAX_MARKDOWN_CHARS = 1_500_000;

function fail(status: number, error: string, extra: Partial<ApiErrorResponse> = {}) {
  return NextResponse.json<ApiErrorResponse>({ error, ...extra }, { status });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'بدنه‌ی درخواست JSON معتبر نیست.');
  }

  if (!body || typeof body !== 'object') {
    return fail(400, 'داده‌ی درخواست نامعتبر است.');
  }

  const markdown = typeof body.markdown === 'string' ? body.markdown : '';
  if (markdown.replace(/\s/g, '').length < 100) {
    return fail(422, 'متن پایان‌نامه برای ارزیابی کافی نیست. ابتدا فایل را آپلود و تبدیل کنید.');
  }
  if (markdown.length > MAX_MARKDOWN_CHARS) {
    return fail(413, 'متن ارسالی بیش از حد مجاز است. لطفاً فایل اصلی را بررسی کنید.');
  }

  const { errors, meta } = validateThesisMeta(body.meta);
  if (Object.keys(errors).length > 0) {
    return fail(422, 'مشخصات پایان‌نامه کامل یا معتبر نیست.', { fieldErrors: errors });
  }

  // دستور اختصاصی کاربر (مثلاً «بر اساس مدل CIPP تحلیل کن») — اختیاری و پاک‌سازی‌شده
  const instructions = cleanMultiline(body.instructions, 1500);

  // قالب ارزیابی: نام و وزن معیارها از کلاینت می‌آید و در سرور اعتبارسنجی می‌شود.
  // اگر قالب ارسال نشود، قالب پیش‌فرض (۸ معیار) استفاده می‌شود.
  const templateInput =
    body.template ??
    (Array.isArray(body.criteria)
      ? { id: 'custom', name: 'قالب سفارشی', criteria: body.criteria }
      : undefined);
  const resolved = resolveTemplateInput(templateInput);
  const template = resolved.template;
  if (!template || resolved.errors.length > 0) {
    return fail(422, 'قالب ارزیابی معتبر نیست.', {
      fieldErrors: { template: resolved.errors.join(' ') },
    });
  }

  try {
    const result = await analyzeThesis({
      markdown,
      meta,
      instructions,
      criteria: template.criteria,
    });
    return NextResponse.json<AnalyzeResponse>({
      ...result,
      template: toTemplateSnapshot(template),
    });
  } catch (error) {
    if (error instanceof AIError) {
      return fail(error.status, error.message, { attempts: error.attempts });
    }
    console.error('[api/analyze] unexpected error:', error);
    return fail(500, 'خطای پیش‌بینی‌نشده در تحلیل رخ داد. لطفاً دوباره تلاش کنید.');
  }
}
