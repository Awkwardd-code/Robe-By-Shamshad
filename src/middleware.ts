import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = process.env.AUTH_SECRET;
const SECRET_KEY = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;
const AUTH_COOKIE_NAME = 'rbs_session';
const PROTECTED_ROUTES = ['/profile'];
const ADMIN_ROUTES = [
  '/dashboard',
  '/categories',
  '/users',
  '/collections',
  '/coupons',
  '/newsletter',
  '/offers',
  '/orders',
  '/seasonal-collection'
];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

const matchesRoute = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

const getRedirectUrl = (request: NextRequest, target = '/login') => {
  const redirectUrl = new URL(target, request.url);
  redirectUrl.searchParams.set('redirect', encodeURIComponent(request.nextUrl.pathname));
  return redirectUrl;
};

interface SessionJwtPayload {
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
  isAdmin?: number | boolean;
}

const decodeToken = async (token: string): Promise<SessionJwtPayload | null> => {
  try {
    if (!SECRET_KEY) {
      console.warn('AUTH_SECRET is missing; skipping session validation');
      return null;
    }
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as SessionJwtPayload;
  } catch (error) {
    console.warn('Failed to decode JWT in middleware', error);
    return null;
  }
};

const isAdminUser = (user: SessionJwtPayload | null) => {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  if (role === 'admin') return true;
  if (typeof user.isAdmin === 'number') return user.isAdmin === 1;
  return Boolean(user.isAdmin);
};

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const normalizedPathname = pathname.toLowerCase().replace(/\/+$/, '');

  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  let user: SessionJwtPayload | null = null;

  if (authToken) {
    user = await decodeToken(authToken);
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    matchesRoute(normalizedPathname, route),
  );
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    matchesRoute(normalizedPathname, route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    matchesRoute(normalizedPathname, route),
  );

  if (isProtectedRoute && !user) {
    console.log(`Middleware: protected route ${pathname} blocked`, { user: null });
    return NextResponse.redirect(getRedirectUrl(request));
  }

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(getRedirectUrl(request));
    }
    const isAdmin = isAdminUser(user);
    if (!isAdmin) {
      console.log(
        `Middleware: admin route ${pathname} denied for ${user.id ?? user.userId ?? 'unknown'}`,
      );
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();

  if (user) {
    response.headers.set('x-user-id', user.id ?? user.userId ?? '');
    response.headers.set('x-user-email', user.email ?? '');
  }

  const duration = Date.now() - startTime;
  console.log(
    `Middleware: ${pathname} (${duration}ms) - user:${user ? user.id ?? user.userId ?? 'unknown' : 'anonymous'}`,
  );

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public/.*|sounds/.*|images/.*).*)'],
};
