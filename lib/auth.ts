import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
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
              role: { select: { name: true } },
            },
          })

          if (!user || !user.password) return null

          const isValid = await compare(credentials.password as string, user.password)
          if (!isValid) return null

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
          console.error('[auth.authorize] error:', err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin
        token.isManager = (user as { isManager: boolean }).isManager
        token.role = (user as { role: string }).role
        return token
      }
      // Ensure token.id is always set (fall back to token.sub which NextAuth sets automatically)
      if (!token.id && token.sub) {
        token.id = token.sub
      }
      // Re-validate: if token.id no longer exists in DB (e.g. after DB reset), re-derive from email
      if (token.id && token.email) {
        const userExists = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        })
        if (!userExists) {
          const freshUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true },
          })
          if (freshUser) {
            token.id = freshUser.id
            token.sub = freshUser.id
            // Force re-hydration of flags
            token.isAdmin = undefined
            token.isManager = undefined
          }
        }
      }
      // Re-hydrate on every token refresh in case the token pre-dates the field
      if (token.id && (token.isAdmin === undefined || token.isManager === undefined || token.role === undefined)) {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: { select: { name: true } } },
        })
        const roleName = freshUser?.role?.name ?? 'EMPLOYEE'
        token.isAdmin = roleName === 'ADMIN' || roleName === 'HR'
        token.isManager = roleName === 'ADMIN' || roleName === 'HR' || roleName === 'MANAGER'
        token.role = roleName
      }
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
