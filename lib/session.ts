/**
 * نشست کاربر با کوکی امضاشده (HMAC-SHA256).
 *
 * این فایل عمداً فقط از Web Crypto استفاده می‌کند تا هم در Node.js
 * (Route Handlerها) و هم در Edge Runtime (middleware) قابل استفاده باشد.
 */
import type { UserRole } from './types';

export const SESSION_COOKIE = 'thesis_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const FALLBACK_SECRET = 'thesis-evaluator-dev-secret-change-me';

export interface SessionPayload {
  uid: string;
  role: UserRole;
  exp: number;
  /** برای استفاده در محیط‌های Serverless بدون KV (تا هویت از خود کوکی امضاشده خوانده شود) */
  username?: string;
  displayName?: string;
}

function secret(): string {
  // در Production حتماً AUTH_SECRET را تنظیم کنید؛ در نبود آن، از رمز مدیر
  // (اگر تنظیم شده باشد) استفاده می‌شود تا حداقل راز پیش‌فرضِ شناخته‌شده نباشد.
  return (
    (process.env.AUTH_SECRET || '').trim() ||
    (process.env.ADMIN_PASSWORD || '').trim() ||
    FALLBACK_SECRET
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(value: string): Promise<Uint8Array> {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto در این محیط در دسترس نیست.');
  }
  const key = await cryptoObj.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await cryptoObj.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return new Uint8Array(signature);
}

function safeEqual(first: string, second: string): boolean {
  if (first.length !== second.length) return false;
  let result = 0;
  for (let index = 0; index < first.length; index += 1) {
    result |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return result === 0;
}

export async function createSessionToken(input: {
  uid: string;
  role: UserRole;
  maxAgeSeconds?: number;
  username?: string;
  displayName?: string;
}): Promise<string> {
  const payload: SessionPayload = {
    uid: input.uid,
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + (input.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS),
    ...(input.username ? { username: input.username } : {}),
    ...(input.displayName ? { displayName: input.displayName } : {}),
  };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(body));
  return `${body}.${signature}`;
}

export async function verifySessionToken(
  token: string | null | undefined,
): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  try {
    const expected = bytesToBase64Url(await hmac(body));
    if (!safeEqual(signature, expected)) return null;

    const parsed = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(body)),
    ) as Partial<SessionPayload>;

    if (!parsed || typeof parsed.uid !== 'string' || !parsed.uid) return null;
    if (parsed.role !== 'admin' && parsed.role !== 'user') return null;
    if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      uid: parsed.uid,
      role: parsed.role,
      exp: parsed.exp,
      ...(typeof parsed.username === 'string' && parsed.username
        ? { username: parsed.username }
        : {}),
      ...(typeof parsed.displayName === 'string' && parsed.displayName
        ? { displayName: parsed.displayName }
        : {}),
    };
  } catch {
    return null;
  }
}

export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) {
      const value = part.slice(separator + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

/**
 * آیا درخواست روی HTTPS انجام شده است؟ پرچم Secure کوکی باید از پروتکل
 * واقعی درخواست خوانده شود، نه فقط از NODE_ENV؛ وگرنه در اجرای تولیدی
 * محلی روی http مرورگر کوکی را ذخیره نمی‌کند و ورود/خروج بی‌صدا از کار
 * می‌افتد (کاربر همیشه به صفحه‌ی ورود برمی‌گردد).
 */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (forwarded) return forwarded === 'https';
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

export function sessionCookieOptions(
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
  options: { secure?: boolean } = {},
) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: options.secure ?? process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
