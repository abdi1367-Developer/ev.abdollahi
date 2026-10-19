/**
 * ذخیره‌سازی فهرست کاربران در Vercel Blob — فقط سمت سرور.
 *
 * چرا Blob؟
 * در Vercel بدون KV، فایل‌سیستم هر Serverless Function فقط‌خواندنی است و
 * حافظه‌ی هر نمونه هم با نمونه‌ی دیگر مشترک نیست؛ بنابراین کاربری که در
 * POST /api/users ساخته می‌شود، در GET /api/users یا POST /api/auth/login
 * دیده نمی‌شد. اگر KV تنظیم نشده باشد اما Blob متصل باشد، snapshotهای
 * رمزنگاری‌شده‌ی کاربران را در Blob نگه می‌داریم تا همه‌ی Functionها یک
 * منبع مشترک داشته باشند.
 *
 * هر ذخیره یک snapshot جدید می‌سازد تا مشکل cache شدن مسیر ثابت (مخصوصاً
 * در Blob Storeهای Public) پیش نیاید؛ هنگام خواندن، جدیدترین snapshot
 * انتخاب می‌شود. محتوای snapshotها در lib/users.ts با AES-GCM رمز می‌شود.
 */
import { randomUUID } from 'crypto';
import { del, get, list, put, type BlobAccessType } from '@vercel/blob';

const USERS_BLOB_PREFIX = 'thesis-auth/users/';
const BLOB_ACCESSES: BlobAccessType[] = ['private', 'public'];
const MAX_SNAPSHOTS = 1000;
const SNAPSHOTS_TO_KEEP = 5;

/** آیا احراز هویت Vercel Blob (توکن یا OIDC) در این محیط ممکن است؟ */
export function isBlobUserStoreConfigured(): boolean {
  const token = (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (token) return true;

  const storeId = (process.env.BLOB_STORE_ID || '').trim();
  const oidcToken = (process.env.VERCEL_OIDC_TOKEN || '').trim();
  return Boolean(storeId && (oidcToken || process.env.VERCEL === '1'));
}

/** ترتیب امتحان سطح دسترسی؛ Store می‌تواند Private یا Public باشد. */
function accessCandidates(url: string): BlobAccessType[] {
  const normalized = url.toLowerCase();
  if (normalized.includes('.private.')) return ['private', 'public'];
  if (normalized.includes('.public.')) return ['public', 'private'];
  return BLOB_ACCESSES;
}

function newestFirst<T extends { uploadedAt: Date }>(items: T[]): T[] {
  return [...items].sort(
    (first, second) =>
      new Date(second.uploadedAt).getTime() - new Date(first.uploadedAt).getTime(),
  );
}

/**
 * خواندن جدیدترین snapshot کاربران.
 * - اگر هیچ snapshotی وجود نداشته باشد null برمی‌گرداند (یعنی هنوز seed نشده).
 * - اگر Blob در دسترس باشد اما خواندن ناموفق باشد، خطا پرتاب می‌کند تا
 *   loadWithSeed به‌اشتباه داده‌ها را خالی فرض نکند و روی آن‌ها بنویسد.
 */
export async function readUsersFromBlob(): Promise<string | null> {
  if (!isBlobUserStoreConfigured()) return null;

  const result = await list({ prefix: USERS_BLOB_PREFIX, limit: MAX_SNAPSHOTS });
  const blobs = newestFirst(
    (result.blobs || []).filter((blob) => blob.pathname.endsWith('.json')),
  );
  if (!blobs.length) return null;

  let lastError: unknown = null;
  for (const blob of blobs) {
    for (const access of accessCandidates(blob.url)) {
      try {
        const response = await get(blob.url, { access, useCache: false });
        if (response && response.statusCode === 200) {
          return await new Response(response.stream).text();
        }
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('خواندن داده‌های کاربران از Vercel Blob ناموفق بود.');
}

/** حذف snapshotهای قدیمی؛ خطای پاک‌سازی نباید ذخیره‌ی اصلی را خراب کند. */
async function cleanupOldSnapshots(keepPathname: string): Promise<void> {
  try {
    const result = await list({ prefix: USERS_BLOB_PREFIX, limit: MAX_SNAPSHOTS });
    const blobs = newestFirst(
      (result.blobs || []).filter((blob) => blob.pathname.endsWith('.json')),
    );
    const stale = blobs
      .filter((blob) => blob.pathname !== keepPathname)
      .slice(Math.max(0, SNAPSHOTS_TO_KEEP - 1));
    await Promise.allSettled(stale.map((blob) => del(blob.url)));
  } catch {
    // پاک‌سازی اختیاری است؛ نسخه‌های قدیمی فقط فضای کمی اشغال می‌کنند.
  }
}

/** نوشتن snapshot جدید کاربران؛ ابتدا Private و در صورت نیاز Public. */
export async function writeUsersToBlob(raw: string): Promise<void> {
  if (!isBlobUserStoreConfigured()) {
    throw new Error('Vercel Blob برای ذخیره‌ی کاربران تنظیم نشده است.');
  }

  const pathname = `${USERS_BLOB_PREFIX}${Date.now()}-${randomUUID()}.json`;
  const errors: string[] = [];

  for (const access of BLOB_ACCESSES) {
    try {
      await put(pathname, raw, {
        access,
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: 'application/json',
      });
      await cleanupOldSnapshots(pathname);
      return;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(
    `ذخیره‌ی کاربران در Vercel Blob ناموفق بود. ${errors.join(' | ')}`.slice(0, 500),
  );
}
