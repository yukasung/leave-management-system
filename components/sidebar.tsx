'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarCheck,
  ClipboardList,
  Briefcase,
  Building2,
  Umbrella,
  CalendarPlus,
  Wallet,
  UserCircle,
  BarChart2,
  CalendarCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileSidebar } from '@/components/mobile-shell'

const ADMIN_TOP_ITEMS = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { href: '/hr/leave-requests', icon: CalendarDays,    label: 'คำขอลา'   },
]

const ADMIN_BOTTOM_ITEMS = [
  { href: '/admin/employees',   icon: Users,     label: 'พนักงาน' },
]

const ADMIN_PERSONAL_ITEMS = [
  { href: '/leave-request', icon: CalendarPlus, label: 'ขอลา'         },
  { href: '/my-leaves',    icon: CalendarDays, label: 'การลาของฉัน' },
  { href: '/leave-balance', icon: Wallet,      label: 'ยอดวันลา'    },
]

const LEAVE_REPORT_ITEMS = [
  { href: '/hr/leave-history',        icon: ClipboardList, label: 'ประวัติการลา'     },
  { href: '/hr/leave-balance-report', icon: Wallet,        label: 'ยอดวันลาคงเหลือ' },
]

const USER_NAV_ITEMS = [
  { href: '/dashboard-user',  icon: LayoutDashboard, label: 'หน้าหลัก'       },
  { href: '/leave-request',   icon: CalendarPlus,    label: 'ขอลา'           },
  { href: '/my-leaves',       icon: CalendarDays,    label: 'การลาของฉัน'   },
  { href: '/leave-balance',   icon: Wallet,          label: 'ยอดวันลา'      },
]

const SETTINGS_SUB_ITEMS = [
  { href: '/admin/departments',          icon: Building2,     label: 'แผนก'          },
  { href: '/admin/settings/positions',   icon: Briefcase,     label: 'ตำแหน่งงาน'  },
  { href: '/admin/holiday-management',   icon: Umbrella,      label: 'วันหยุด'       },
  { href: '/admin/settings/leave-types', icon: ClipboardList, label: 'ประเภทการลา' },
  { href: '/hr/leave-year-reset',        icon: CalendarCog,   label: 'รีเซ็ตยอดวันลา' },
]

export default function Sidebar({ isAdmin = false, isManager = false }: { isAdmin?: boolean; isManager?: boolean }) {
  const rawPathname = usePathname()
  const params = useParams()
  const locale = (params?.locale as string) || ''
  // Strip locale prefix so active detection works regardless of /th/ or /en/ prefix
  const pathname = locale ? rawPathname.replace(new RegExp(`^/${locale}`), '') || '/' : rawPathname

  // Build locale-prefixed href for links
  const href = (path: string) => locale ? `/${locale}${path}` : path

  const [collapsed, setCollapsed] = useState(true)
  const { open: mobileOpen, close: mobileClose } = useMobileSidebar()
  // On mobile overlay, always show expanded (ignore localStorage collapsed state)
  const isCollapsed = mobileOpen ? false : collapsed

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })

  const REPORT_PATHS = ['/hr/leave-summary', '/hr/leave-history', '/hr/leave-balance-report']
  const isReportsActive = REPORT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isSettingsActive = pathname === '/admin/settings' || pathname.startsWith('/admin/settings/') || pathname === '/admin/holiday-management' || pathname.startsWith('/admin/holiday-management/') || pathname === '/hr/leave-year-reset' || pathname === '/admin/departments' || pathname.startsWith('/admin/departments/')
  const [reportsOpen, setReportsOpen] = useState(isReportsActive)
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar shrink-0',
        'transition-[width,transform] duration-300 ease-in-out overflow-hidden',
        // Desktop: always shown, collapsible
        'relative',
        isCollapsed ? 'md:w-15' : 'md:w-60',
        // Mobile: hidden by default, slide in as overlay when open
        mobileOpen
          ? 'fixed inset-y-0 left-0 z-50 w-64 translate-x-0'
          : 'hidden md:flex md:flex-col',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-3 shrink-0',
          isCollapsed ? 'justify-center' : 'gap-3',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/70 shadow-sm ring-1 ring-primary/20">
          <CalendarCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[0.8rem] font-bold tracking-tight text-sidebar-foreground truncate">
              จัดการวันลา
            </span>
            <span className="text-[10px] text-sidebar-foreground/40 truncate">{isAdmin ? 'พอร์ทัลผู้ดูแลระบบ' : 'พอร์ทัลพนักงาน'}</span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) mobileClose() }}>
        {/* Top nav items (admin: dashboard + leave requests; users: all items) */}
        {(isAdmin ? ADMIN_TOP_ITEMS : USER_NAV_ITEMS).map(({ href: itemPath, icon: Icon, label }) => {
          const active = pathname === itemPath || pathname.startsWith(itemPath + '/')
          return (
            <Link
              key={itemPath}
              href={href(itemPath)}
              title={isCollapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
                'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isCollapsed ? 'justify-center px-2' : 'px-2.5',
              )}
            >
              {active && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                )}
              />
              {!isCollapsed && <span className="truncate">{label}</span>}
              {!isCollapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />
              )}
            </Link>
          )
        })}

        {/* Personal leave links — visible to both admin and regular users */}
        {isAdmin && ADMIN_PERSONAL_ITEMS.map(({ href: itemPath, icon: Icon, label }) => {
          const active = pathname === itemPath || pathname.startsWith(itemPath + '/')
          return (
            <Link
              key={itemPath}
              href={href(itemPath)}
              title={isCollapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
                'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isCollapsed ? 'justify-center px-2' : 'px-2.5',
              )}
            >
              {active && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                )}
              />
              {!isCollapsed && <span className="truncate">{label}</span>}
              {!isCollapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />
              )}
            </Link>
          )
        })}

        {/* Manager: คำขอลาที่รออนุมัติ — renders before โปรไฟล์ (skip if admin already has it) */}
        {isManager && !isAdmin && (() => {
          const itemPath = '/manager/leave-requests'
          const active = pathname === itemPath || pathname.startsWith(itemPath + '/')
          return (
            <Link
              href={href(itemPath)}
              title={isCollapsed ? 'คำขอลา' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
                'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isCollapsed ? 'justify-center px-2' : 'px-2.5',
              )}
            >
              {active && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-primary" />
              )}
              <CalendarDays
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                )}
              />
              {!isCollapsed && <span className="truncate">คำขอลา</span>}
              {!isCollapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />
              )}
            </Link>
          )
        })()}

        {/* โปรไฟล์ — always last in user nav */}
        {(() => {
          const itemPath = '/profile'
          const active = pathname === itemPath || pathname.startsWith(itemPath + '/')
          return (
            <Link
              href={href(itemPath)}
              title={isCollapsed ? 'โปรไฟล์' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
                'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isCollapsed ? 'justify-center px-2' : 'px-2.5',
              )}
            >
              {active && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-primary" />
              )}
              <UserCircle
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                )}
              />
              {!isCollapsed && <span className="truncate">โปรไฟล์</span>}
              {!isCollapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />
              )}
            </Link>
          )
        })()}

        {/* Bottom nav items — admin only */}
        {isAdmin && ADMIN_BOTTOM_ITEMS.map(({ href: itemPath, icon: Icon, label }) => {
          const active = pathname === itemPath || pathname.startsWith(itemPath + '/')
          return (
            <Link
              key={itemPath}
              href={href(itemPath)}
              title={isCollapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
                'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isCollapsed ? 'justify-center px-2' : 'px-2.5',
              )}
            >
              {active && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                )}
              />
              {!isCollapsed && <span className="truncate">{label}</span>}
              {!isCollapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />
              )}
            </Link>
          )
        })}

        {/* Reports group — admin only */}
        {isAdmin && (
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (isCollapsed) {
                  setCollapsed(false)
                  localStorage.setItem('sidebar-collapsed', 'false')
                  setReportsOpen(true)
                } else {
                  setReportsOpen((o) => !o)
                }
              }}
              title={isCollapsed ? 'รายงาน' : undefined}
              className={cn(
                'group relative w-full flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
                'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                isReportsActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isCollapsed ? 'justify-center px-2' : 'px-2.5',
              )}
            >
              {isReportsActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-primary" />
              )}
              <BarChart2
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isReportsActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                )}
              />
              {!isCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">รายงาน</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                      reportsOpen ? 'rotate-180' : '',
                      isReportsActive ? 'text-primary' : 'text-sidebar-foreground/40',
                    )}
                  />
                </>
              )}
            </button>

            {/* Leave Reports sub-group */}
            {!isCollapsed && reportsOpen && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-sidebar-border space-y-0.5">
                {LEAVE_REPORT_ITEMS.map(({ href: itemPath, icon: Icon, label }) => {
                  const active = pathname === itemPath || pathname.startsWith(itemPath + '/')
                  return (
                    <Link
                      key={itemPath}
                      href={href(itemPath)}
                      className={cn(
                        'group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-150',
                        active
                          ? 'text-primary font-medium bg-primary/5'
                          : 'text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          active ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                        )}
                      />
                      <span className="truncate">{label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings group — admin only */}
        {isAdmin && <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (isCollapsed) {
                setCollapsed(false)
                localStorage.setItem('sidebar-collapsed', 'false')
                setSettingsOpen(true)
              } else {
                setSettingsOpen((o) => !o)
              }
            }}
            title={isCollapsed ? 'ตั้งค่า' : undefined}
            className={cn(
              'group relative w-full flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
              'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              isSettingsActive
                ? 'bg-primary/10 text-primary'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isCollapsed ? 'justify-center px-2' : 'px-2.5',
            )}
          >
            {isSettingsActive && !isCollapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-primary" />
            )}
            <Settings
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isSettingsActive
                  ? 'text-primary'
                  : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
              )}
            />
            {!isCollapsed && (
              <>
                <span className="truncate flex-1 text-left">ตั้งค่า</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                    settingsOpen ? 'rotate-180' : '',
                    isSettingsActive ? 'text-primary' : 'text-sidebar-foreground/40',
                  )}
                />
              </>
            )}
          </button>

          {/* Sub-items */}
          {!isCollapsed && settingsOpen && (
            <div className="mt-0.5 ml-4 pl-3 border-l border-sidebar-border space-y-0.5">
              {SETTINGS_SUB_ITEMS.map(({ href: itemPath, icon: Icon, label }) => {
                const active = pathname === itemPath || pathname.startsWith(itemPath + '/')
                return (
                  <Link
                    key={itemPath}
                    href={href(itemPath)}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-150',
                      active
                        ? 'text-primary font-medium'
                        : 'text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent',
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground')} />
                    <span className="truncate">{label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-3 border-t border-sidebar-border shrink-0">
        {!isCollapsed ? (
          <div className="px-2.5 py-2 rounded-lg bg-linear-to-r from-primary/5 to-primary/10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              ระบบจัดการวันลา
            </p>
            <p className="text-[10px] text-sidebar-foreground/30 mt-0.5">เวอร์ชัน 1.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarCheck className="h-3 w-3 text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className={cn(
          'absolute -right-3 top-13 z-20 hidden md:flex h-6 w-6 items-center justify-center',
          'rounded-full border border-sidebar-border bg-sidebar shadow-md',
          'text-sidebar-foreground/40 hover:text-primary hover:bg-primary/10',
          'transition-all duration-150',
        )}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>
    </aside>
  )
}
