'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, CalendarDays, CheckCircle2, Clock, Users } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    } else {
      router.push('/dashboard-user')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary flex-col items-center justify-center p-12 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-8 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10 max-w-sm text-center">
          {/* Logo icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/15 mb-8 ring-1 ring-white/20">
            <CalendarDays className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">ระบบจัดการวันลา</h1>
          <p className="text-primary-foreground/70 text-base leading-relaxed mb-12">
            บริหารจัดการการลาพักของพนักงาน<br />ได้อย่างสะดวก รวดเร็ว และมีประสิทธิภาพ
          </p>

          <div className="space-y-4 text-left">
            {[
              { icon: CheckCircle2, text: 'ขอลาออนไลน์ได้ทุกที่ทุกเวลา' },
              { icon: Clock,         text: 'ติดตามสถานะคำขอแบบ Real-time' },
              { icon: Users,         text: 'จัดการทีมและอนุมัติได้ง่าย' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/85 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">ระบบจัดการวันลา</span>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">เข้าสู่ระบบ</h2>
              <p className="text-muted-foreground text-sm mt-1">กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน</p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl text-sm">
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  อีเมล
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="example@company.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-input bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 border border-input bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  'เข้าสู่ระบบ'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} ระบบจัดการวันลา · สงวนลิขสิทธิ์
          </p>
        </div>
      </div>
    </div>
  )
}
