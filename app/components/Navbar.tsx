'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

export type CurrentUser = {
  id:    string
  name:  string
  email: string
  role:  'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'EXECUTIVE'
}

// ── Role badge config ─────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<CurrentUser['role'], { label: string; cls: string }> = {
  ADMIN:     { label: 'Admin',     cls: 'bg-purple-100 text-purple-700' },
  HR:        { label: 'HR',        cls: 'bg-blue-100 text-blue-700'     },
  MANAGER:   { label: 'Manager',   cls: 'bg-indigo-100 text-indigo-700' },
  EXECUTIVE: { label: 'Executive', cls: 'bg-amber-100 text-amber-700'   },
  EMPLOYEE:  { label: 'พนักงาน',  cls: 'bg-gray-100 text-gray-600'     },
}

// ── Nav types ─────────────────────────────────────────────────────────────────
type NavLink  = { href: string; label: string }
type NavGroup = { label: string; links: NavLink[] }

const EXACT_MATCH = new Set(['/dashboard'])

function isActive(pathname: string, href: string): boolean {
  if (EXACT_MATCH.has(href)) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

function getNavGroups(role: CurrentUser['role']): NavGroup[] {
  const groups: NavGroup[] = []

  groups.push({
    label: 'ทั่วไป',
    links: [
      { href: '/dashboard',    label: 'Dashboard'       },
      { href: '/leave-request',label: 'ยื่นคำขอลา'     },
      { href: '/my-leaves',    label: 'การลาของฉัน'     },
      { href: '/leave-balance',label: 'สิทธิ์การลา'     },
      { href: '/notifications',label: 'การแจ้งเตือน'    },
      { href: '/profile',      label: 'โปรไฟล์ของฉัน'  },
    ],
  })

  if (role === 'MANAGER') {
    groups.push({
      label: 'จัดการทีม',
      links: [{ href: '/manager/leave-requests', label: 'อนุมัติการลาทีม' }],
    })
  }

  if (role === 'HR') {
    groups.push({
      label: 'HR',
      links: [
        { href: '/hr/leave-requests', label: 'คำขอลาทั้งหมด' },
        { href: '/hr/leave-report',   label: 'รายงานการลา'   },
        { href: '/hr/audit-logs',     label: 'Audit Log'     },
      ],
    })
  }

  if (role === 'EXECUTIVE') {
    groups.push({
      label: 'ผู้บริหาร',
      links: [{ href: '/executive', label: 'Executive Dashboard' }],
    })
  }

  if (role === 'ADMIN') {
    groups.push({
      label: 'Admin',
      links: [
        { href: '/hr/leave-requests',  label: 'คำขอลาทั้งหมด'  },
        { href: '/admin/employees',    label: 'จัดการพนักงาน' },
        { href: '/admin/departments',  label: 'จัดการแผนก'    },
        { href: '/admin/settings',     label: 'ตั้งค่าระบบ'   },
      ],
    })
  }

  return groups
}

// ── Component ─────────────────────────────────────────────────────────────────
const MENU_ID = 'mobile-nav-menu'

export default function Navbar({ currentUser }: { currentUser: CurrentUser | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuRef   = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (
        menuRef.current   && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  if (!currentUser) return null

  const { name, role } = currentUser
  const roleConf = ROLE_CONFIG[role]
  const groups   = getNavGroups(role)

  return (
    <nav
      aria-label="Main navigation"
      className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40"
    >
      {/* ── Top bar ── */}
      <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-3">

        {/* Left: Logo + desktop links */}
        <div className="flex items-center gap-5 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 shrink-0 group"
            aria-label="Leave Management — home"
          >
            <span
              aria-hidden
              className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold select-none group-hover:bg-blue-700 transition"
            >
              LM
            </span>
            <span className="hidden sm:block font-semibold text-gray-800 text-sm tracking-tight">
              Leave Management
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center" role="list">
            {groups.map((group, gi) => (
              <div key={group.label} className="flex items-center" role="listitem">
                {gi > 0 && <span aria-hidden className="mx-2 h-4 w-px bg-gray-200" />}
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive(pathname, link.href)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: badge + name + logout + hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleConf.cls}`}
          >
            {roleConf.label}
          </span>

          <span className="hidden md:block text-sm font-medium text-gray-700 max-w-30 truncate">
            {name}
          </span>

          <form action={logout}>
            <button
              type="submit"
              className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              ออกจากระบบ
            </button>
          </form>

          {/* Hamburger — visible below lg */}
          <button
            ref={triggerRef}
            type="button"
            aria-controls={MENU_ID}
            aria-expanded={open}
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {/* Animated bars → X */}
            <span aria-hidden className="block w-5 h-5 relative">
              <span
                className={`absolute left-0 top-1 h-0.5 w-full bg-current rounded transition-all duration-200 ${
                  open ? 'rotate-45 top-2.25' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-2.25 h-0.5 w-full bg-current rounded transition-all duration-200 ${
                  open ? 'opacity-0 scale-x-0' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-3.5 h-0.5 w-full bg-current rounded transition-all duration-200 ${
                  open ? '-rotate-45 top-2.25' : ''
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        id={MENU_ID}
        ref={menuRef}
        role="region"
        aria-label="Mobile navigation"
        className={`lg:hidden overflow-hidden transition-all duration-200 ease-in-out ${
          open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="border-t border-gray-100 bg-white px-4 pb-4">

          {/* User row */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleConf.cls}`}
              >
                {roleConf.label}
              </span>
              <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>

          {/* Nav groups */}
          {groups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-3' : ''}>
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {group.label}
              </p>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive(pathname, link.href)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {/* Active indicator dot */}
                  {isActive(pathname, link.href) && (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}


