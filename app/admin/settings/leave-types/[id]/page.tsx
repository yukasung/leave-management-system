import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditLeaveTypeForm from './EditLeaveTypeForm'

export default async function EditLeaveTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session || !session.user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 font-semibold">Unauthorized</p>
      </div>
    )
  }

  const { id } = await params

  const leaveType = await prisma.leaveType.findUnique({
    where: { id },
    include: { _count: { select: { leaveRequests: true } } },
  })

  if (!leaveType) notFound()

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/admin/settings" className="hover:text-indigo-600">ตั้งค่าระบบ</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{leaveType.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">แก้ไขประเภทการลา</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <EditLeaveTypeForm leaveType={leaveType} />
      </div>
    </div>
  )
}
