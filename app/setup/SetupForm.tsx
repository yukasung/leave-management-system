'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initializeSystem, type SetupState } from './actions'
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, FlaskConical } from 'lucide-react'

const initialState: SetupState = {}

export default function SetupForm({ preview = false }: { preview?: boolean }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(initializeSystem, initialState)
  const [showPassword, setShowPassword]         = useState(false)
  const [showConfirm,  setShowConfirm]          = useState(false)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/login'), 2000)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  const e = state.errors ?? {}

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">

        {/* Dev preview banner */}
        {preview && (
          <div className="mb-6 flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-400 rounded-xl text-xs font-medium">
            <FlaskConical className="w-4 h-4 shrink-0" />
            <span>Dev Preview — กำลังแสดงหน้านี้ถึงแม้มี users ในระบบแล้ว (ไม่ส่งผลต่อข้อมูลจริง)</span>
          </div>
        )}

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ตั้งค่าระบบครั้งแรก</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            สร้างบัญชีผู้ดูแลระบบเพื่อเริ่มใช้งานระบบจัดการวันลา
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">

          {/* Success banner */}
          {state.success && (
            <div className="mb-6 flex items-start gap-2.5 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 rounded-xl text-sm">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.message} — กำลังนำคุณไปหน้าเข้าสู่ระบบ…</span>
            </div>
          )}

          {/* General error */}
          {e.general && (
            <div className="mb-6 flex items-start gap-2 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl text-sm">
              <span className="shrink-0">⚠</span>
              {e.general}
            </div>
          )}

          <form action={formAction} className="space-y-5" noValidate>
            {preview && <input type="hidden" name="_preview" value="1" />}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1.5">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="ชื่อ"
                    disabled={state.success}
                    className={fieldCls(!!e.firstName)}
                  />
                </div>
                {e.firstName && <p className="mt-1 text-xs text-red-500">{e.firstName}</p>}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1.5">
                  นามสกุล <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="นามสกุล"
                    disabled={state.success}
                    className={fieldCls(!!e.lastName)}
                  />
                </div>
                {e.lastName && <p className="mt-1 text-xs text-red-500">{e.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                อีเมล <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@company.com"
                  disabled={state.success}
                  className={fieldCls(!!e.email, 'pl-10')}
                />
              </div>
              {e.email && <p className="mt-1 text-xs text-red-500">{e.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  disabled={state.success}
                  className={fieldCls(!!e.password, 'pl-10 pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {e.password && <p className="mt-1 text-xs text-red-500">{e.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  disabled={state.success}
                  className={fieldCls(!!e.confirmPassword, 'pl-10 pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {e.confirmPassword && <p className="mt-1 text-xs text-red-500">{e.confirmPassword}</p>}
            </div>

            {/* Role badge */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-400 text-sm">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>บัญชีนี้จะได้รับสิทธิ์ <strong>ผู้ดูแลระบบ (Admin)</strong> โดยอัตโนมัติ</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={pending || state.success}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  กำลังสร้างบัญชี…
                </>
              ) : (
                'สร้างบัญชีผู้ดูแลระบบ'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} ระบบจัดการวันลา · สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  )
}

// ── Utility ──────────────────────────────────────────────────────────────────

function fieldCls(hasError: boolean, extra = 'pl-10') {
  return [
    'w-full py-2.5 pr-4 border bg-background text-foreground rounded-xl',
    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
    'transition placeholder:text-muted-foreground/50 disabled:opacity-60',
    extra,
    hasError
      ? 'border-red-400 focus:ring-red-400/50 focus:border-red-400'
      : 'border-input',
  ].join(' ')
}
