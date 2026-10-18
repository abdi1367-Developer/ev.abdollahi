/**
 * کمک‌کننده‌های احراز هویت برای Route Handlerها (Node.js).
 * middleware فقط وجود کوکی امضاشده را بررسی می‌کند؛ نقش و وضعیت واقعی
 * کاربر در هر API حساس از همین فایل و از منبع کاربران خوانده می‌شود.
 */
import { NextResponse } from 'next/server';
import { readCookie, SESSION_COOKIE, verifySessionToken } from './session';
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

export async function getSessionUser(request: Request): Promise<PublicUser | null> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await getUserById(session.uid).catch(() => null);
  if (!user || !user.active) return null;
  return user;
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
