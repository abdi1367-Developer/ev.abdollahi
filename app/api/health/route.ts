/**
 * GET /api/health — گزارش وضعیت محیط اجرا برای عیب‌یابی ورود و ذخیره‌سازی.
 *
 * این مسیر عمومی است و هیچ راز یا مقدار حساسی برنمی‌گرداند (فقط true/false و
 * نام منبع). برای بررسی سریع مشکلات Production روی Vercel:
 *   curl -s https://<domain>/api/health
 */
import { NextResponse } from 'next/server';
import { resolveDeepSeekKey } from '@/lib/ai/providers';
import { SESSION_COOKIE } from '@/lib/session';
import { isKvConfigured } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secretSource(): 'AUTH_SECRET' | 'ADMIN_PASSWORD' | 'fallback' {
  if ((process.env.AUTH_SECRET || '').trim()) return 'AUTH_SECRET';
  if ((process.env.ADMIN_PASSWORD || '').trim()) return 'ADMIN_PASSWORD';
  return 'fallback';
}

export async function GET() {
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const kv = isKvConfigured();
  const deepseekKey = resolveDeepSeekKey();
  const deepseekModel = (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim() || 'deepseek-chat';

  const payload = {
    status: 'ok',
    time: new Date().toISOString(),
    runtime: {
      node: process.version,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      region: process.env.VERCEL_REGION || null,
    },
    auth: {
      cookie: SESSION_COOKIE,
      webCrypto: Boolean(globalThis.crypto?.subtle),
      secretSource: secretSource(),
      adminUsername: (process.env.ADMIN_USERNAME || 'admin').trim() || 'admin',
      adminPasswordConfigured: adminPassword.length > 0,
      adminPasswordLongEnough: adminPassword.length >= 8,
    },
    storage: {
      users: kv ? 'kv' : 'file-or-memory',
      history: kv ? 'kv' : 'localStorage',
      blob: Boolean((process.env.BLOB_READ_WRITE_TOKEN || '').trim()),
    },
    ai: {
      // مدل اصلی DeepSeek است؛ کلید اول از متغیر محیطی و در نبود آن از کلید
      // داخلیِ کد خوانده می‌شود، بنابراین ready باید همیشه true باشد.
      primary: 'deepseek',
      ready: deepseekKey.source !== 'none',
      keySource: deepseekKey.source,
      deepseek: deepseekKey.source !== 'none',
      deepseekModel,
      openrouter: Boolean((process.env.OPENROUTER_API_KEY || '').trim()),
    },
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
