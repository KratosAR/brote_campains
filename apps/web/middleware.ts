import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('accessToken')?.value

  console.log(`[MIDDLEWARE] ${pathname} - has token: ${!!token}`)

  // Auth pages - allow access if no token, redirect to home if authenticated
  if (pathname === '/login' || pathname === '/register') {
    if (token) {
      console.log(`[MIDDLEWARE] Redirecting ${pathname} to / (authenticated)`)
      return NextResponse.redirect(new URL('/', request.url))
    }
    console.log(`[MIDDLEWARE] Allowing ${pathname} (public)`)
    return NextResponse.next()
  }

  // Protect all other routes
  if (!token) {
    console.log(`[MIDDLEWARE] Redirecting ${pathname} to /login (no token)`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
