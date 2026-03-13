'use client'

import { useRouter } from 'next/navigation'

type Props = {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  position: string | null
  isAdmin: boolean
  isManager: boolean
  isActive: boolean
  isProbation: boolean
  departmentName: string | null
}

export default function EmployeeRow({
  id,
  employeeCode,
  firstName,
  lastName,
  email,
  avatarUrl,
  position,
  isAdmin,
  isManager,
  isActive,
  isProbation,
  departmentName,
}: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/admin/employees/${id}`)}
      className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors cursor-pointer"
    >
      <td className="px-5 py-3.5 font-mono text-muted-foreground text-xs whitespace-nowrap">
        {employeeCode}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/60 to-primary text-primary-foreground text-[10px] font-bold select-none">
                {`${firstName}${lastName}`.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground whitespace-nowrap">
              {firstName} {lastName}
            </span>
            {isProbation && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-medium whitespace-nowrap">
                ทดลองงาน
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-center text-muted-foreground whitespace-nowrap">
        {departmentName ?? <span className="text-muted-foreground/40">—</span>}
      </td>
      <td className="px-5 py-3.5 text-center text-muted-foreground whitespace-nowrap">{position}</td>
      <td className="px-5 py-3.5 text-center whitespace-nowrap">
        <div className="flex flex-col items-center gap-1">
          {isAdmin && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50">
              ผู้ดูแลระบบ
            </span>
          )}
          {isManager && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
              ผู้อนุมัติการลา
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 text-center whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
              : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? 'bg-emerald-500' : 'bg-red-400'
            }`}
          />
          {isActive ? 'ทำงานอยู่' : 'ไม่ทำงาน'}
        </span>
      </td>
    </tr>
  )
}
