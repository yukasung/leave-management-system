import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatThaiDateTime } from '@/lib/date-utils'

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">การแจ้งเตือน</h1>
          <p className="text-sm text-gray-500 mt-1">
            {notifications.length} รายการทั้งหมด
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                {unreadCount} ยังไม่ได้อ่าน
              </span>
            )}
          </p>
        </div>
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">ไม่มีการแจ้งเตือน</div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`flex items-start gap-4 rounded-lg border px-5 py-4 transition-colors ${
                notification.isRead
                  ? 'border-gray-200 bg-white'
                  : 'border-blue-200 bg-blue-50'
              }`}
            >
              {/* Unread dot */}
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                }`}
              />

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    notification.isRead ? 'text-gray-600' : 'font-semibold text-gray-800'
                  }`}
                >
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatThaiDateTime(notification.createdAt)}
                </p>
              </div>

              {!notification.isRead && (
                <span className="shrink-0 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  ใหม่
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
