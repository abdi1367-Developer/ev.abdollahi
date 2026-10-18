/** POST /api/auth/logout — خروج و پاک کردن کوکی نشست */
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, isSecureRequest, sessionCookieOptions } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    ...sessionCookieOptions(0, { secure: isSecureRequest(request) }),
    maxAge: 0,
  });
  return response;
}
