import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents')
const MAX_SIZE   = 10 * 1024 * 1024 // 10 MB
const VALID_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const EXT_MAP: Record<string, string> = {
  'application/pdf':      'pdf',
  'image/jpeg':           'jpg',
  'image/png':            'png',
  'image/webp':           'webp',
  'application/msword':   'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'รองรับเฉพาะ PDF, JPG, PNG, WEBP, DOC, DOCX' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'ไฟล์ต้องไม่เกิน 10 MB' }, { status: 400 })
  }

  const ext      = EXT_MAP[file.type]
  const filename = `${randomUUID()}.${ext}`
  const filePath = path.join(UPLOAD_DIR, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  return NextResponse.json({ url: `/uploads/documents/${filename}`, name: file.name })
}
