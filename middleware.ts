/**
 * محافظت از صفحات و APIها با نشست امضاشده.
 * بررسی کامل نقش و وضعیت کاربر در Route Handlerها انجام می‌شود؛ اینجا فقط
 * جلوی دسترسی بدون کوکی معتبر را می‌گیریم.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

const PUBLIC_PATHS = new Set([
  '/login',
  '/about',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
]);

/**
 * این مسیرها نشست را داخل خود Route Handler بررسی می‌کنند.
 * لازم است چون Vercel Blob پس از پایان آپلود یک callback بدون کوکی به
 * /api/blob/upload می‌فرستد و باید بتواند پاسخ ۲۰۰ بگیرد؛ صدور توکن آپلود
 * همچنان در همان Route با requireUser محافظت می‌شود.
 */
const SESSION_CHECKED_IN_HANDLER = new Set(['/api/blob/upload']);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === '/login' && session) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!session) {
    if (SESSION_CHECKED_IN_HANDLER.has(pathname)) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'برای دسترسی باید وارد حساب کاربری شوید.' },
        { status: 401 },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
