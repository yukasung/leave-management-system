'use client'

import { useActionState, useState } from 'react'
import { updateProfile, changePassword } from './actions'
import AvatarUploader from '@/app/admin/employees/AvatarUploader'

export type ProfileData = {
  userId:      string
  name:        string
  email:       string
  isAdmin:     boolean
  department:  string | null
  // from linked Employee
  firstName:   string | null
  lastName:    string | null
  phone:       string | null
  avatarUrl:   string | null
  position:    string | null
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

export default function ProfileForm({ data }: { data: ProfileData }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, {
    success: false,
    message: '',
  })
  const [pwdState, pwdAction, pwdPending] = useActionState(changePassword, {
    success: false,
    message: '',
  })

  // Track name locally for initials
  const [name, setName] = useState(data.name)

  const initials = (() => {
    if (data.firstName && data.lastName)
      return `${data.firstName[0]}${data.lastName[0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase() || 'ME'
  })()

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Basic info card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">ข้อมูลส่วนตัว</h2>
          <p className="text-xs text-gray-500 mt-0.5">แก้ไขชื่อ เบอร์โทร และรูปโปรไฟล์</p>
        </div>
        <form action={profileAction} className="px-6 py-6 space-y-6">

          {/* Avatar + name/phone row */}
          <div className="flex items-center gap-6">
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <AvatarUploader
                compact
                name="avatarUrl"
                defaultUrl={data.avatarUrl ?? undefined}
                initials={initials}
              />
              <span className="text-[10px] text-gray-400">คลิกเพื่อเปลี่ยนรูป</span>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="name">ชื่อที่แสดง</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={data.name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="phone">เบอร์โทรศัพท์</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={data.phone ?? ''}
                  placeholder="0812345678"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Read-only info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-4">
            <div>
              <span className="font-medium text-gray-500 block mb-0.5">อีเมล</span>
              {data.email}
            </div>
            <div>
              <span className="font-medium text-gray-500 block mb-0.5">สิทธิ์ระบบ</span>
              {data.isAdmin
                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Admin</span>
                : <span className="text-gray-600">พนักงาน</span>
              }
            </div>
            {data.department && (
              <div>
                <span className="font-medium text-gray-500 block mb-0.5">แผนก</span>
                {data.department}
              </div>
            )}
            {data.position && (
              <div>
                <span className="font-medium text-gray-500 block mb-0.5">ตำแหน่ง</span>
                {data.position}
              </div>
            )}
          </div>

          {/* Status message */}
          {profileState.message && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                profileState.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {profileState.message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profilePending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {profilePending ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change password card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">เปลี่ยนรหัสผ่าน</h2>
          <p className="text-xs text-gray-500 mt-0.5">รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร</p>
        </div>
        <form action={pwdAction} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls} htmlFor="currentPassword">รหัสผ่านปัจจุบัน</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="newPassword">รหัสผ่านใหม่</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
          </div>

          {/* Status message */}
          {pwdState.message && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                pwdState.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {pwdState.message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwdPending}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {pwdPending ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
