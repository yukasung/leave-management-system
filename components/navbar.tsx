'use client'

import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
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

export type AdminUser = {
  name: string
  email: string
  avatarUrl?: string | null
  isAdmin: boolean
}

export default function Navbar({
  title,
  user,
}: {
  title: string
  user: AdminUser | null
}) {
  const initials = user?.name
    ? user.name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-5 gap-4">
      {/* Page title */}
      <h1 className="flex-1 text-sm font-semibold text-foreground">{title}</h1>

      {/* Search */}
      <div className="hidden md:flex relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search…"
          className="pl-8 h-8 text-sm bg-muted/40 border-input focus-visible:ring-1 rounded-lg"
        />
      </div>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <Link
        href="/notifications"
        aria-label="Notifications"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative h-8 w-8')}
      >
        <Bell className="h-4 w-4" />
      </Link>

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
                {user.isAdmin ? 'Admin' : 'User'}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <p className="px-1.5 py-1 text-xs text-muted-foreground font-normal truncate">
              {user.email}
            </p>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/profile" className="w-full">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/admin/settings" className="w-full">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <form action={logout} className="w-full">
                <button type="submit" className="w-full text-left">
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
