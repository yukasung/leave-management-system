import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatThaiDateTime } from '@/lib/date-utils'
import AdminLayout from '@/components/admin-layout'

const ACTION_BADGE: Record<string, string> = {
  CREATE_LEAVE_REQUEST: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  APPROVE_LEAVE:        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  REJECT_LEAVE:         'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/50',
}
const ACTION_BADGE_DEFAULT = 'bg-muted text-muted-foreground border-border'

export default async function AuditLogPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const [logs, dbUser] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const user = {
    name:     session.user.name ?? '',
    email:    session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:  true,
  }

  return (
    <AdminLayout title="Audit Log" user={user}>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{logs.length} รายการทั้งหมด</p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center text-muted-foreground">
            ไม่พบรายการ
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ผู้ดำเนินการ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log, index) => (
                    <tr key={log.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground/60">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{log.user.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            ACTION_BADGE[log.action] ?? ACTION_BADGE_DEFAULT
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.entityType}</td>
                      <td className="px-4 py-3 text-muted-foreground/60 font-mono text-xs truncate max-w-40">
                        {log.entityId}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.description ?? <span className="text-muted-foreground/30 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatThaiDateTime(log.createdAt, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
