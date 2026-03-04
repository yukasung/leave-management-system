import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import HolidayImportClient from './HolidayImportClient'

export default async function HolidayManagementPage() {
  const session = await auth()

  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'HR') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl font-semibold">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-gray-500 text-sm mt-1">เฉพาะ ADMIN และ HR เท่านั้น</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการวันหยุดนักขัตฤกษ์</h1>
        <p className="text-sm text-gray-500 mt-1">
          นำเข้าวันหยุดประจำปีของประเทศไทยจากฐานข้อมูลสาธารณะ
        </p>
      </div>

      <HolidayImportClient />
    </div>
  )
}
