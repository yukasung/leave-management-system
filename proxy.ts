import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// ── Role-based route protection ───────────────────────────────────────────────
const ROLE_ROUTES: { prefix: string; roles: string[] }[] = [
  { prefix: '/admin',     roles: ['ADMIN']     },
  { prefix: '/hr',        roles: ['HR']        },
  { prefix: '/manager',   roles: ['MANAGER']   },
  { prefix: '/executive', roles: ['EXECUTIVE'] },
]

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

  // Role-based protection
  if (isLoggedIn) {
    const role  = session?.user?.role as string | undefined
    const rule  = ROLE_ROUTES.find((r) => nextUrl.pathname.startsWith(r.prefix))
    if (rule && (!role || !rule.roles.includes(role))) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

