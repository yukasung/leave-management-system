import type { ReactNode } from 'react'
import { Users, Clock, CalendarDays, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccentKey = 'blue' | 'green' | 'yellow' | 'red' | 'indigo' | 'violet' | 'default'

type StatCardProps = {
  label: string
  value: number | string
  sub?: string
  icon: ReactNode
  accent?: AccentKey
  trend?: { value: number; positive: boolean }
}

const accentValue: Record<AccentKey, string> = {
  default: 'text-foreground',
  blue:    'text-blue-600 dark:text-blue-400',
  green:   'text-emerald-600 dark:text-emerald-400',
  yellow:  'text-amber-600 dark:text-amber-400',
  red:     'text-red-600 dark:text-red-400',
  indigo:  'text-indigo-600 dark:text-indigo-400',
  violet:  'text-violet-600 dark:text-violet-400',
}

const iconBg: Record<AccentKey, string> = {
  default: 'bg-muted text-muted-foreground',
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
  green:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  yellow:  'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  red:     'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400',
  indigo:  'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'default',
  trend,
}: StatCardProps) {
  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 dark:ring-white/10', iconBg[accent])}>
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={cn('text-3xl font-bold tracking-tight tabular-nums', accentValue[accent])}>
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        {trend && (
          <div
            className={cn(
              'mb-0.5 flex items-center gap-0.5 text-xs font-medium',
              trend.positive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500 dark:text-red-400',
            )}
          >
            {trend.positive
              ? <TrendingUp className="h-3.5 w-3.5" />
              : <TrendingDown className="h-3.5 w-3.5" />
            }
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardCards({
  totalEmployees,
  pendingApprovals,
  todayRequests,
  approvedThisMonth,
}: {
  totalEmployees: number
  pendingApprovals: number
  todayRequests: number
  approvedThisMonth: number
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Employees"
        value={totalEmployees}
        sub="Active in the system"
        accent="blue"
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        label="Pending Approvals"
        value={pendingApprovals}
        sub="Awaiting review"
        accent="yellow"
        icon={<Clock className="h-4 w-4" />}
      />
      <StatCard
        label="Requests Today"
        value={todayRequests}
        sub="New submissions"
        accent="indigo"
        icon={<CalendarDays className="h-4 w-4" />}
      />
      <StatCard
        label="Approved This Month"
        value={approvedThisMonth}
        sub="Month-to-date"
        accent="green"
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
    </div>
  )
}
