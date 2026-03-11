import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        const isValid = await compare(credentials.password as string, user.password)
        if (!isValid) return null

        // Resolve admin flag from employee record
        const employee = await prisma.employee.findUnique({
          where: { userId: user.id },
          select: { isAdmin: true, isManager: true },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: employee?.isAdmin ?? false,
          isManager: employee?.isManager ?? false,
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
      }
      // Re-hydrate on every token refresh in case the token pre-dates the field
      if (token.id && (token.isAdmin === undefined || token.isManager === undefined)) {
        const employee = await prisma.employee.findUnique({
          where: { userId: token.id as string },
          select: { isAdmin: true, isManager: true },
        })
        token.isAdmin = employee?.isAdmin ?? false
        token.isManager = employee?.isManager ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.isManager = token.isManager as boolean
      }
      return session
    },
  },
})
