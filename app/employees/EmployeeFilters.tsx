'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTransition } from 'react'
import { Search, X } from 'lucide-react'

type Dept = { id: string; name: string }

export default function EmployeeFilters({
  search,
  department,
  departments,
}: {
  search: string
  department: string
  departments: Dept[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const update = (key: string, value: string) => {
    const q = new URLSearchParams(params.toString())
    if (value) q.set(key, value)
    else q.delete(key)
    q.delete('page')
    startTransition(() => { router.push(`${pathname}?${q.toString()}`) })
  }

  const hasFilters = !!search || !!department

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="ค้นหาชื่อหรืออีเมล…"
          defaultValue={search}
          onChange={(e) => update('search', e.target.value)}
          className="pl-8 h-8 text-sm w-full"
        />
      </div>

      {/* Department filter */}
      <select
        value={department}
        onChange={(e) => update('department', e.target.value)}
        className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">ทุกแผนก</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={() => {
            startTransition(() => { router.push(pathname) })
          }}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          ล้าง
        </Button>
      )}
    </div>
  )
}
