'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export type AdminUser = {
  name: string
  email: string
  avatarUrl?: string | null
  isAdmin: boolean
  isManager?: boolean
}

export default function Navbar({
  title,
  user,
}: {
  title: string
  user: AdminUser | null
}) {
  const params = useParams()
  const locale = (params?.locale as string) || 'th'
  const lp = (path: string) => `/${locale}${path}`

  const initials = user?.name
    ? user.name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-5 gap-4">
      {/* Page title */}
      <h1 className="flex-1 text-sm font-semibold text-foreground">{title}</h1>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* User menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors outline-none">
            <Avatar className="h-7 w-7">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left leading-none">
              <p className="text-xs font-medium text-foreground">{user.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {user.isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้ใช้'}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <p className="px-1.5 py-1 text-xs text-muted-foreground font-normal truncate">
              {user.email}
            </p>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href={lp('/profile')} className="w-full">
                โปรไฟล์
              </Link>
            </DropdownMenuItem>
            {user.isAdmin && (
              <DropdownMenuItem>
                <Link href={lp('/admin/settings')} className="w-full">
                  ตั้งค่า
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <form action={logout} className="w-full">
                <button type="submit" className="w-full text-left">
                  ออกจากระบบ
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
