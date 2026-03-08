import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatThaiDateTime } from '@/lib/date-utils'
import AdminLayout from '@/components/admin-layout'

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [notifications, dbUser] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
  }

  return (
    <AdminLayout title="การแจ้งเตือน" user={user}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">การแจ้งเตือน</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {notifications.length} รายการทั้งหมด
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {unreadCount} ยังไม่ได้อ่าน
                </span>
              )}
            </p>
          </div>
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center text-muted-foreground">
            ไม่มีการแจ้งเตือน
          </div>
        ) : (
          <ul className="space-y-2.5">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`flex items-start gap-4 rounded-xl border px-5 py-4 transition-colors ${
                  notification.isRead
                    ? 'border-border bg-card'
                    : 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                }`}
              >
                {/* Unread dot */}
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    notification.isRead ? 'bg-muted-foreground/30' : 'bg-primary'
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      notification.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground'
                    }`}
                  >
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {formatThaiDateTime(notification.createdAt)}
                  </p>
                </div>

                {!notification.isRead && (
                  <span className="shrink-0 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    ใหม่
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  )
}
