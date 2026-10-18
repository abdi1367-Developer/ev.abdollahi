/**
 * تضمین دسترسی به Web Crypto در محیط Node.js (Route Handlerها و Server Componentها).
 *
 * فایل `lib/session.ts` عمداً فقط از `globalThis.crypto` استفاده می‌کند تا هم در
 * Node.js و هم در Edge Runtime (middleware) کار کند؛ اما در Node.js ۱۸ این شیء
 * به‌صورت global در دسترس نیست. در آن حالت `crypto.subtle` وجود ندارد، امضای
 * کوکی نشست شکست می‌خورد و ورود کاربر روی Vercel با خطای ۵۰۰ تمام می‌شود
 * (کاربر پشت صفحه‌ی ورود می‌ماند).
 *
 * این فایل فقط در محیط Node.js ایمپورت می‌شود و middleware آن را نمی‌بیند؛
 * بنابراین استفاده از `node:crypto` اینجا باندل Edge را خراب نمی‌کند.
 */
import { webcrypto } from 'node:crypto';

interface CryptoScope {
  crypto?: { subtle?: unknown };
}

const scope = globalThis as unknown as CryptoScope;

if (!scope.crypto?.subtle) {
  scope.crypto = webcrypto as unknown as CryptoScope['crypto'];
}

export {};
