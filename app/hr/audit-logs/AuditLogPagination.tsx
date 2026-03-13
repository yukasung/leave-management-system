'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  totalPages: number
}

export default function AuditLogPagination({ page, totalPages }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  function go(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (totalPages <= 1) return null

  // Build visible page numbers: always show first/last + window of 5 around current
  const pages: (number | 'ellipsis')[] = []
  const WINDOW = 2
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - WINDOW && i <= page + WINDOW)
    ) {
      pages.push(i)
    } else if (
      pages[pages.length - 1] !== 'ellipsis'
    ) {
      pages.push('ellipsis')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      {/* Prev */}
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        aria-label="หน้าก่อนหน้า"
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ell-${i}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            className={`inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-lg border text-sm font-medium transition-colors ${
              p === page
                ? 'border-primary bg-primary text-primary-foreground pointer-events-none'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        aria-label="หน้าถัดไป"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
