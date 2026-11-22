import { NextResponse, type NextRequest } from 'next/server';
import { isLaunch, isShowcase } from './lib/config';

/**
 * Expose le pathname courant au rendu serveur (header x-pathname),
 * afin que le layout puisse scoper le thème saisonnier dès le SSR
 * (pas de flash hiver→été à l'hydratation).
 */
export function middleware(req: NextRequest) {
  if (isLaunch() && req.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', req.url), 307);
  }
  if (isShowcase() && /^\/(?:checkout|admin)(?:\/|$)/.test(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/collections', req.url), 307);
  }
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
