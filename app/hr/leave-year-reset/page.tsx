import { prisma }     from '@/lib/prisma'
import { auth }       from '@/lib/auth'
import { redirect }   from 'next/navigation'
import AdminLayout    from '@/components/admin-layout'
import LeaveYearResetClient from './LeaveYearResetClient'
import { getYearSummary } from './actions'

export default async function LeaveYearResetPage() {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { avatarUrl: true },
  })
  const user = {
    name:      session.user.name  ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl  ?? null,
    isAdmin:   true,
  }

  const yearSummary  = await getYearSummary()
  const currentYear  = new Date().getFullYear()

  return (
    <AdminLayout title="รีเซ็ตยอดวันลาประจำปี" user={user}>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">รีเซ็ตยอดวันลาประจำปี</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              สร้างโควตาวันลาใหม่สำหรับพนักงานทุกคนในปีที่เลือก
            </p>
          </div>
        </div>

        <LeaveYearResetClient
          yearSummary={yearSummary}
          currentYear={currentYear}
        />
      </div>
    </AdminLayout>
  )
}
