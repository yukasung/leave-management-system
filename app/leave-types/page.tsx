import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'
import { buttonVariants } from '@/lib/button-variants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, CheckCircle2, XCircle } from 'lucide-react'

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  ) : (
    <XCircle className="h-4 w-4 text-muted-foreground/40" />
  )
}

export default async function LeaveTypesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const [leaveTypes, dbUser] = await Promise.all([
    prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { leaveRequests: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="Leave Types" user={user}>
      <div className="space-y-5 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Leave Types</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {leaveTypes.length} type{leaveTypes.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <Link href="/admin/settings/leave-types/new" className={buttonVariants()}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Leave Type
            </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {leaveTypes.slice(0, 3).map((lt) => (
            <div
              key={lt.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-foreground">{lt.name}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {lt._count.leaveRequests} requests
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {lt.maxDaysPerYear ?? '∞'}
                <span className="ml-1 text-xs font-normal text-muted-foreground">days / year</span>
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BoolIcon value={lt.requiresAttachment} />
                  Attachment
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BoolIcon value={lt.deductFromBalance} />
                  Deduct bal.
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {leaveTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">No leave types defined</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first leave type to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Days / Year
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Max / Request
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Attachment
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Deduct Balance
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Allow Probation
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Requests
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((lt) => (
                    <TableRow key={lt.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{lt.name}</p>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {lt.maxDaysPerYear ?? '∞'}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {lt.maxDaysPerRequest ?? '∞'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <BoolIcon value={lt.requiresAttachment} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <BoolIcon value={lt.deductFromBalance} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <BoolIcon value={lt.allowDuringProbation} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {lt._count.leaveRequests}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/settings/leave-types/${lt.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                          >
                            Edit
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
