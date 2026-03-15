import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              isActive: true,
              role: { select: { name: true } },
            },
          })

          if (!user) {
            console.warn('[auth.authorize] user not found:', credentials.email)
            return null
          }
          if (!user.password) {
            console.warn('[auth.authorize] user has no password:', credentials.email)
            return null
          }
          if (!user.isActive) {
            console.warn('[auth.authorize] user is inactive:', credentials.email)
            return null
          }

          const isValid = await compare(credentials.password as string, user.password)
          if (!isValid) {
            console.warn('[auth.authorize] wrong password for:', credentials.email)
            return null
          }

          const roleName = user.role?.name ?? 'EMPLOYEE'

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: roleName === 'ADMIN' || roleName === 'HR',
            isManager: roleName === 'ADMIN' || roleName === 'HR' || roleName === 'MANAGER',
            role: roleName,
          }
        } catch (err) {
          console.error('[auth.authorize] DB error:', err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in: populate token from the user object returned by authorize()
      if (user) {
        token.id = user.id
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin
        token.isManager = (user as { isManager: boolean }).isManager
        token.role = (user as { role: string }).role
        return token
      }
      // Ensure token.id is always set
      if (!token.id && token.sub) {
        token.id = token.sub
      }
      // Token is self-contained — all role data was embedded at sign-in.
      // We intentionally avoid DB calls here so this callback is safe in both
      // Edge (middleware) and Node.js runtimes, and never causes redirect loops
      // when the database is temporarily unavailable.
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = (token.id ?? token.sub) as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.isManager = token.isManager as boolean
        session.user.role = token.role as string
      }
      return session
    },
  },
})
