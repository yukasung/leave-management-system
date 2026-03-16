'use client'

import { useRef, useState, useEffect } from 'react'

interface Props {
  name?:         string
  defaultUrl?:   string | null
  initials?:     string
  compact?:      boolean   // circle only, no label panel
  onUploaded?:   (url: string) => void
}

export default function AvatarUploader({ name = 'avatarUrl', defaultUrl, initials = '?', compact = false, onUploaded }: Props) {
  const [preview,    setPreview]    = useState<string | null>(defaultUrl ?? null)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(defaultUrl ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync when server refreshes defaultUrl (e.g. after save)
  useEffect(() => {
    setPreview(defaultUrl ?? null)
    setCurrentUrl(defaultUrl ?? null)
  }, [defaultUrl])

  // Resize + compress image client-side to max 400x400 JPEG (≈ 50-80 KB as base64)
  function resizeToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const MAX = 400
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = objectUrl
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)

    try {
      // Resize client-side → send base64 → API stores directly in DB
      const base64 = await resizeToBase64(file)

      const res  = await fetch('/api/upload/employee-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'อัปโหลดไม่สำเร็จ')
        setPreview(currentUrl)
        return
      }

      setCurrentUrl(json.url)
      setPreview(json.url)
      onUploaded?.(json.url)
    } catch {
      setError('เกิดข้อผิดพลาดในการอัปโหลด')
      setPreview(currentUrl)
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    setPreview(null)
    setCurrentUrl(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={compact ? 'relative inline-block' : 'flex items-start gap-5'}>
      {/* Avatar display */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-gray-200 hover:ring-blue-400 transition focus:outline-none"
          title="คลิกเพื่อเปลี่ยนรูป"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold select-none">
              {initials.slice(0, 2).toUpperCase()}
            </span>
          )}

          {/* Overlay */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
            {uploading ? (
              <svg className="h-5 w-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </span>
        </button>

        {/* Remove button */}
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition shadow"
            title="ลบรูป"
          >
            ×
          </button>
        )}
      </div>

      {/* Right side text + hidden inputs — hidden in compact mode */}
      {compact ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <input type="hidden" name={name} value={currentUrl ?? ''} />
        </>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-0.5">รูปโปรไฟล์</p>
          <p className="text-xs text-muted-foreground/60 mb-2">JPG, PNG, WEBP หรือ GIF · ไม่เกิน 5 MB</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/40 text-muted-foreground transition disabled:opacity-50"
          >
            {uploading ? 'กำลังอัปโหลด…' : 'เลือกรูป'}
          </button>
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

          {/* Hidden inputs */}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <input type="hidden" name={name} value={currentUrl ?? ''} />
        </div>
      )}
    </div>
  )
}
