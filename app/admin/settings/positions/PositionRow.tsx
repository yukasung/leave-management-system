'use client'

import { useRouter } from 'next/navigation'

type Props = {
  id: string
  index: number
  name: string
  departmentName: string | null
  employeeCount: number
}

export default function PositionRow({ id, index, name, departmentName, employeeCount }: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/admin/settings/positions/${id}`)}
      className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors cursor-pointer"
    >
      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{index}</td>
      <td className="px-5 py-4 font-medium text-foreground">{name}</td>
      <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
        {departmentName ?? <span className="italic opacity-40">—</span>}
      </td>
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {employeeCount}
        </span>
      </td>
    </tr>
  )
}
