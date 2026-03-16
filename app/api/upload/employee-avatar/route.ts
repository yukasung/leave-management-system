import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_SIZE    = 5 * 1024 * 1024 // 5 MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

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

  const buffer     = Buffer.from(await file.arrayBuffer())
  const dataUri    = `data:${file.type};base64,${buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'leave-management/employees',
    resource_type: 'image',
  })

  // Delete old Cloudinary image if it exists
  if (oldUrl && oldUrl.includes('cloudinary.com')) {
    const publicId = oldUrl.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
    await cloudinary.uploader.destroy(publicId).catch(() => {})
  }

  return NextResponse.json({ url: result.secure_url })
}
