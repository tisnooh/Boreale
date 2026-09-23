import { NextResponse, type NextRequest } from 'next/server';

/**
 * Expose le pathname courant au rendu serveur (header x-pathname),
 * afin que le layout puisse scoper le thème saisonnier dès le SSR
 * (pas de flash hiver→été à l'hydratation).
 */
export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
