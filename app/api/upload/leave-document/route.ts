import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_SIZE    = 10 * 1024 * 1024 // 10 MB
const VALID_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const RESOURCE_TYPE: Record<string, 'image' | 'raw'> = {
  'application/pdf':      'raw',
  'image/jpeg':           'image',
  'image/png':            'image',
  'image/webp':           'image',
  'application/msword':   'raw',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'raw',
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

  const buffer      = Buffer.from(await file.arrayBuffer())
  const dataUri     = `data:${file.type};base64,${buffer.toString('base64')}`
  const resType     = RESOURCE_TYPE[file.type] ?? 'raw'

  const result = await cloudinary.uploader.upload(dataUri, {
    folder:        'leave-management/documents',
    resource_type: resType,
    use_filename:  true,
    unique_filename: true,
  })

  return NextResponse.json({ url: result.secure_url, name: file.name })
}
