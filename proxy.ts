import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// ── Admin-only route protection ───────────────────────────────────────────────
const ADMIN_ROUTES = ['/admin', '/hr']

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const isAuthPage = nextUrl.pathname.startsWith('/login')
  const isApiAuth  = nextUrl.pathname.startsWith('/api/auth')

  if (isApiAuth) return NextResponse.next()

  // Not logged in → redirect to login
  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in on auth page → redirect to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Admin-only route protection
  if (isLoggedIn) {
    const isAdminRoute = ADMIN_ROUTES.some((r) => nextUrl.pathname.startsWith(r))
    if (isAdminRoute && !session?.user?.isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

