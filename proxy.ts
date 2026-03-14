import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// ── Admin-only route protection ───────────────────────────────────────────────
const ADMIN_ROUTES = ['/admin', '/hr']

const intlMiddleware = createIntlMiddleware(routing)

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const isSetupPage = nextUrl.pathname === '/setup' || nextUrl.pathname.startsWith('/setup/')
  const isAuthPage = nextUrl.pathname.startsWith('/login')
    || nextUrl.pathname.match(/^\/(th|en)\/login/) !== null
  const isApiAuth  = nextUrl.pathname.startsWith('/api/auth')
  const isApiRoute = nextUrl.pathname.startsWith('/api/')

  // Setup page is accessible without authentication (first-time system init)
  if (isSetupPage) return NextResponse.next()

  if (isApiAuth || isApiRoute) return NextResponse.next()

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

  // Apply next-intl locale routing
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}

