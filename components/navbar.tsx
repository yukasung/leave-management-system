'use client'

import { Bell, Languages } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
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
import { usePathname, useParams, useRouter } from 'next/navigation'

export type AdminUser = {
  name: string
  email: string
  avatarUrl?: string | null
  isAdmin: boolean
}

function LanguageSwitcher() {
  const params = useParams()
  const locale = (params?.locale as string) || 'th'
  const rawPathname = usePathname()
  const router = useRouter()

  const switchLocale = (next: string) => {
    const pathWithoutLocale = rawPathname.replace(new RegExp(`^/${locale}`), '') || '/'
    router.push(`/${next}${pathWithoutLocale}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
        title="Switch language"
      >
        <Languages className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => switchLocale('th')}
          className={locale === 'th' ? 'font-semibold text-primary' : ''}
        >
          🇹🇭 ภาษาไทย
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLocale('en')}
          className={locale === 'en' ? 'font-semibold text-primary' : ''}
        >
          🇬🇧 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
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

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Notifications */}
      <Link
        href={lp('/notifications')}
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
              <Link href={lp('/profile')} className="w-full">
                Profile
              </Link>
            </DropdownMenuItem>
            {user.isAdmin && (
              <DropdownMenuItem>
                <Link href={lp('/admin/settings')} className="w-full">
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
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
