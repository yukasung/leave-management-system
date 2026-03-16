import Sidebar from '@/components/sidebar'
import Navbar, { type AdminUser } from '@/components/navbar'
import { MobileShell } from '@/components/mobile-shell'

export default function AdminLayout({
  title,
  user,
  children,
}: {
  title: string
  user: AdminUser | null
  children: React.ReactNode
}) {
  return (
    <MobileShell>
      <Sidebar isAdmin={user?.isAdmin ?? false} isManager={user?.isManager ?? false} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Navbar title={title} user={user} />
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {children}
        </main>
      </div>
    </MobileShell>
  )
}
