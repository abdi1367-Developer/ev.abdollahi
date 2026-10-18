/**
 * کمک‌کننده‌های احراز هویت برای Route Handlerها (Node.js).
 * middleware فقط وجود کوکی امضاشده را بررسی می‌کند؛ نقش و وضعیت واقعی
 * کاربر در هر API حساس از همین فایل و از منبع کاربران خوانده می‌شود.
 */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readCookie, SESSION_COOKIE, verifySessionToken } from './session';
import { isKvConfigured } from './store';
import type { ApiErrorResponse, PublicUser } from './types';
import { getUserById } from './users';

export interface AuthFailure {
  user?: undefined;
  response: NextResponse<ApiErrorResponse>;
}

export interface AuthSuccess {
  user: PublicUser;
  response?: undefined;
}

/**
 * هویت کاربر را از توکن نشست می‌خواند. اگر KV تنظیم نشده باشد و کاربر در
 * حافظه‌ی این Function پیدا نشود، اطلاعاتِ امضاشده‌ی همان کوکی مبنا قرار می‌گیرد.
 */
async function resolveSessionUser(token: string | null | undefined): Promise<PublicUser | null> {
  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await getUserById(session.uid).catch(() => null);
  if (user) return user.active ? user : null;

  // در Vercel بدون KV، حافظه/فایل هر Serverless Function جداست و کاربری که
  // هنگام ورود ساخته شده در نمونه‌ی دیگری پیدا نمی‌شود. چون کوکی با HMAC
  // امضا شده است، هویت معتبر را از خود توکن می‌خوانیم تا ورود بین APIها
  // (مثلاً login → convert) از بین نرود. با تنظیم KV این مسیر غیرفعال است.
  if (!isKvConfigured() && session.username) {
    return {
      id: session.uid,
      username: session.username,
      displayName: session.displayName || session.username,
      role: session.role,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function getSessionUser(request: Request): Promise<PublicUser | null> {
  return resolveSessionUser(readCookie(request.headers.get('cookie'), SESSION_COOKIE));
}

/**
 * همان getSessionUser، اما برای Server Componentهایی مثل RootLayout که به
 * شیء Request دسترسی ندارند. نتیجه‌اش باعث می‌شود دکمه‌ی ورود/خروج از همان
 * ابتدا در HTML سرور رندر شود و به fetch سمت کلاینت وابسته نباشد.
 */
export async function getSessionUserFromCookies(): Promise<PublicUser | null> {
  return resolveSessionUser(cookies().get(SESSION_COOKIE)?.value);
}

function fail(status: number, error: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json<ApiErrorResponse>({ error }, { status });
}

export async function requireUser(request: Request): Promise<AuthSuccess | AuthFailure> {
  const user = await getSessionUser(request);
  if (!user) {
    return { response: fail(401, 'برای دسترسی باید وارد حساب کاربری شوید.') };
  }
  return { user };
}

export async function requireAdmin(request: Request): Promise<AuthSuccess | AuthFailure> {
  const user = await getSessionUser(request);
  if (!user) {
    return { response: fail(401, 'برای دسترسی باید وارد حساب کاربری شوید.') };
  }
  if (user.role !== 'admin') {
    return { response: fail(403, 'این بخش فقط برای مدیر سامانه در دسترس است.') };
  }
  return { user };
}
