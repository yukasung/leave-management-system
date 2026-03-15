'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTransition, useCallback } from 'react'
import { Search, X } from 'lucide-react'

const STATUSES = [
  { value: '',          label: 'ทุกสถานะ'  },
  { value: 'PENDING',   label: 'รออนุมัติ'       },
  { value: 'IN_REVIEW', label: 'กำลังพิจารณา'     },
  { value: 'APPROVED',  label: 'อนุมัติแล้ว'      },
  { value: 'REJECTED',  label: 'ไม่อนุมัติ'      },
  { value: 'CANCELLED', label: 'ยกเลิกแล้ว'     },
]

export default function LeaveRequestFilters({
  search,
  status,
}: {
  search: string
  status: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const update = useCallback(
    (key: string, value: string) => {
      const q = new URLSearchParams(params.toString())
      if (value) q.set(key, value)
      else q.delete(key)
      q.delete('page')
      startTransition(() => { router.push(`${pathname}?${q.toString()}`) })
    },
    [router, pathname, params],
  )

  const hasFilters = !!search || !!status

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="ค้นหาพนักงาน…"
          defaultValue={search}
          onChange={(e) => update('search', e.target.value)}
          className="pl-8 h-8 text-sm w-full"
        />
      </div>

      {/* Status filter */}
      <select
        value={status}
        onChange={(e) => update('status', e.target.value)}
        className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
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
            const q = new URLSearchParams()
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
