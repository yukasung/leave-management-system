import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { seedRoles } from '@/lib/seed-roles'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  // Ensure roles exist before any authentication attempt
  await seedRoles()

  const userCount = await prisma.user.count()
  if (userCount === 0) redirect('/setup')
  return <LoginForm />
}
