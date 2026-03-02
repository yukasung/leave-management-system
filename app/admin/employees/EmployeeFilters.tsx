'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Department = { id: string; name: string }

export default function EmployeeFilters({
  departments,
}: {
  departments: Department[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 whenever filters change
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Name search */}
      <input
        type="search"
        defaultValue={searchParams.get('search') ?? ''}
        placeholder="ค้นหาชื่อ / รหัสพนักงาน..."
        onChange={(e) => update('search', e.target.value)}
        className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Department filter */}
      <select
        defaultValue={searchParams.get('department') ?? ''}
        onChange={(e) => update('department', e.target.value)}
        className="w-full sm:w-56 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">ทุกแผนก</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </div>
  )
}
