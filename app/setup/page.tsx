import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { seedRoles } from '@/lib/seed-roles'
import SetupForm from './SetupForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ตั้งค่าระบบ | Leave Management System',
}

// Disable caching so the initialization check is always fresh
export const dynamic = 'force-dynamic'

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  // Guarantee roles exist even if instrumentation hook was skipped
  await seedRoles()

  const { preview } = await searchParams
  const isDevPreview = process.env.NODE_ENV === 'development' && preview === '1'

  const userCount = await prisma.user.count()
  if (userCount > 0 && !isDevPreview) redirect('/login')
  return <SetupForm preview={isDevPreview} />
}
