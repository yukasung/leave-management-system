import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'employees')
const MAX_SIZE   = 5 * 1024 * 1024 // 5 MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  const oldUrl   = formData.get('oldUrl') as string | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'รองรับเฉพาะ JPG, PNG, WEBP, GIF' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'ไฟล์ต้องไม่เกิน 5 MB' }, { status: 400 })
  }

  const ext      = EXT_MAP[file.type]
  const filename = `${randomUUID()}.${ext}`
  const filePath = path.join(UPLOAD_DIR, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  // Delete old file if it exists
  if (oldUrl) {
    const oldFilename = path.basename(oldUrl)
    const oldPath     = path.join(UPLOAD_DIR, oldFilename)
    if (existsSync(oldPath)) {
      await unlink(oldPath).catch(() => {})
    }
  }

  return NextResponse.json({ url: `/uploads/employees/${filename}` })
}
