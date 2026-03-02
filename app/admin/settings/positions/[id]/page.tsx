import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditPositionForm from './EditPositionForm'

export default async function EditPositionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-red-500 font-semibold">Unauthorized</p></div>
  }

  const { id } = await params
  const position = await prisma.position.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  })
  if (!position) notFound()

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/admin/settings" className="hover:text-indigo-600">ตั้งค่าระบบ</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{position.name}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">แก้ไขตำแหน่งงาน</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <EditPositionForm position={position} />
      </div>
    </div>
  )
}
