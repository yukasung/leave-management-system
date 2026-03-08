'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Tags,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/leave-requests',    icon: CalendarDays,    label: 'Leave Requests' },
  { href: '/employees',         icon: Users,           label: 'Employees'      },
  { href: '/leave-types',       icon: Tags,            label: 'Leave Types'    },
  { href: '/hr/leave-requests', icon: BarChart2,       label: 'Reports'        },
  { href: '/admin/settings',    icon: Settings,        label: 'Settings'       },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-sidebar-border bg-sidebar shrink-0',
        'transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-3 shrink-0',
          collapsed ? 'justify-center' : 'gap-3',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-sm ring-1 ring-primary/20">
          <CalendarCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[0.8rem] font-bold tracking-tight text-sidebar-foreground truncate">
              Leave Manager
            </span>
            <span className="text-[10px] text-sidebar-foreground/40 truncate">Admin Portal</span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium',
                'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed ? 'justify-center px-2' : 'px-2.5',
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground',
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-3 border-t border-sidebar-border shrink-0">
        {!collapsed ? (
          <div className="px-2.5 py-2 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Leave Management
            </p>
            <p className="text-[10px] text-sidebar-foreground/30 mt-0.5">System v1.0</p>
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
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          'absolute -right-3 top-[52px] z-20 flex h-6 w-6 items-center justify-center',
          'rounded-full border border-sidebar-border bg-sidebar shadow-md',
          'text-sidebar-foreground/40 hover:text-primary hover:bg-primary/10',
          'transition-all duration-150',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>
    </aside>
  )
}
