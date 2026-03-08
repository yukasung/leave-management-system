import Sidebar from '@/components/sidebar'
import Navbar, { type AdminUser } from '@/components/navbar'

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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isAdmin={user?.isAdmin ?? false} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Navbar title={title} user={user} />
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </main>
      </div>
    </div>
  )
}
