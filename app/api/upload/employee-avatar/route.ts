import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const MAX_BASE64_LEN = 400 * 1024 * 1.4 // ~400 KB base64 string

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { base64?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { base64 } = body
  if (!base64 || !base64.startsWith('data:image/')) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลรูปภาพ' }, { status: 400 })
  }
  if (base64.length > MAX_BASE64_LEN) {
    return NextResponse.json({ error: 'รูปภาพใหญ่เกินไป' }, { status: 400 })
  }

  // Return base64 data URL directly — the form saves it as avatarUrl in DB
  return NextResponse.json({ url: base64 })
}

