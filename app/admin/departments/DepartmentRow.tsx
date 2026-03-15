'use client'

import { useRouter } from 'next/navigation'

type Props = {
  id: string
  index: number
  name: string
  employeeCount: number
}

export default function DepartmentRow({ id, index, name, employeeCount }: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/admin/departments/${id}`)}
      className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors cursor-pointer"
    >
      <td className="px-5 py-4 text-muted-foreground/60 whitespace-nowrap">{index}</td>
      <td className="px-5 py-4 font-medium text-foreground">{name}</td>
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground font-semibold text-xs">
          {employeeCount}
        </span>
      </td>
    </tr>
  )
}
