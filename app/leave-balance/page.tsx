import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function LeaveBalancePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const balances = await prisma.leaveBalance.findMany({
    where: { userId: session.user.id },
    orderBy: { leaveType: { name: 'asc' } },
    include: { leaveType: { select: { name: true } } },
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">สิทธิ์การลาคงเหลือ</h1>
        <p className="text-sm text-gray-500 mt-1">ปี {new Date().getFullYear()}</p>
      </div>

      {balances.length === 0 ? (
        <div className="text-center text-gray-500 py-16 bg-white rounded-2xl shadow-sm">
          ยังไม่มีข้อมูลสิทธิ์การลา
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow-sm">
          <table className="w-full bg-white text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 font-semibold">
                <th className="px-5 py-3">ประเภทการลา</th>
                <th className="px-5 py-3 text-center">สิทธิ์ทั้งหมด</th>
                <th className="px-5 py-3 text-center">ใช้ไปแล้ว</th>
                <th className="px-5 py-3 text-center">คงเหลือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {balances.map((balance) => {
                const remaining = balance.totalDays - balance.usedDays
                const isLow = remaining <= 2
                const isEmpty = remaining <= 0

                return (
                  <tr key={balance.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {balance.leaveType.name}
                    </td>
                    <td className="px-5 py-4 text-center text-gray-700">
                      {balance.totalDays} วัน
                    </td>
                    <td className="px-5 py-4 text-center text-gray-700">
                      {balance.usedDays} วัน
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          isEmpty
                            ? 'bg-red-100 text-red-600'
                            : isLow
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {remaining} วัน
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
