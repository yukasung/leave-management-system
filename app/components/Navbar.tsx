import { auth } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

export default async function Navbar() {
  const session = await auth()
  if (!session) return null

  const { name, role } = session.user

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left: brand + links */}
      <div className="flex items-center gap-6">
        <span className="font-bold text-gray-800 text-base tracking-tight">
          Leave Management
        </span>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <Link href="/leave-request" className="hover:text-blue-600 transition-colors">
            ยื่นคำขอลา
          </Link>
          <Link href="/my-leaves" className="hover:text-blue-600 transition-colors">
            ประวัติการลา
          </Link>
          <Link href="/leave-balance" className="hover:text-blue-600 transition-colors">
            สิทธิ์การลา
          </Link>
          <Link href="/notifications" className="hover:text-blue-600 transition-colors">
            การแจ้งเตือน
          </Link>
          {(role === 'MANAGER' || role === 'ADMIN') && (
            <Link href="/manager/leave-requests" className="hover:text-blue-600 transition-colors">
              อนุมัติการลา
            </Link>
          )}
          {(role === 'HR' || role === 'ADMIN') && (
            <>
              <Link href="/hr/leave-requests" className="hover:text-blue-600 transition-colors">
                HR
              </Link>
              <Link href="/hr/audit-logs" className="hover:text-blue-600 transition-colors">
                Audit Log
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-gray-800">{name}</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </nav>
  )
}
