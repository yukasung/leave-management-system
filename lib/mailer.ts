// ── Types ─────────────────────────────────────────────────────────────────────

export type MailOptions = {
  to:      string | string[]
  subject: string
  html:    string
  text?:   string
}

// ── sendMail ──────────────────────────────────────────────────────────────────

/**
 * Send email via Brevo REST API (preferred — works on Railway where port 587 is blocked)
 * or fall back to Nodemailer SMTP if BREVO_API_KEY is not set.
 */
export async function sendMail(options: MailOptions): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY

  if (brevoApiKey) {
    await sendViaBrevoApi(options, brevoApiKey)
  } else {
    await sendViaSMTP(options)
  }
}

// ── Brevo REST API sender ─────────────────────────────────────────────────────

async function sendViaBrevoApi(options: MailOptions, apiKey: string): Promise<void> {
  const fromRaw  = process.env.SMTP_FROM ?? 'noreply@example.com'
  // Parse "Display Name" <email@domain.com>  OR  plain email
  const match    = fromRaw.match(/^"?([^"<]+)"?\s*<([^>]+)>$/)
  const sender   = match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { email: fromRaw.trim() }

  const recipients = (Array.isArray(options.to) ? options.to : [options.to])
    .map(e => ({ email: e.trim() }))

  const body = {
    sender,
    to:          recipients,
    subject:     options.subject,
    htmlContent: options.html,
    ...(options.text ? { textContent: options.text } : {}),
  }

  console.log('[mailer] Sending email via Brevo API | To:', options.to, '| Subject:', options.subject)

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[mailer] Brevo API error ${res.status}: ${err}`)
  }

  console.log('[mailer] Email sent successfully via Brevo API | To:', options.to)
}

// ── SMTP fallback (nodemailer) ────────────────────────────────────────────────

import nodemailer from 'nodemailer'

let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return _transporter
}

async function sendViaSMTP(options: MailOptions): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] Skipping email — neither BREVO_API_KEY nor SMTP is configured. To:', options.to)
    return
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER
  console.log('[mailer] Sending email via SMTP | To:', options.to, '| Subject:', options.subject, '| From:', from)

  await getTransporter().sendMail({
    from,
    to:      Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html:    options.html,
    text:    options.text,
  })

  console.log('[mailer] Email sent successfully via SMTP | To:', options.to)
}

// ── Email Templates ───────────────────────────────────────────────────────────

const MONTH_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน',
  'พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม',
  'กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]
function thaiDate(d: Date) {
  return `${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

// ── Leave Approved Email ─────────────────────────────────────────────────────

export type LeaveApprovedMailData = {
  employeeName:       string
  leaveTypeName:      string
  totalDays:          number
  leaveStartDateTime: Date
  leaveEndDateTime:   Date
  leaveRequestId:     string
}

export function buildLeaveApprovedEmail(data: LeaveApprovedMailData): { subject: string; html: string; text: string } {
  const { employeeName, leaveTypeName, totalDays, leaveStartDateTime, leaveEndDateTime, leaveRequestId } = data
  const daysStr  = Number.isInteger(totalDays) ? `${totalDays}` : parseFloat(totalDays.toFixed(2)).toString()
  const startStr = thaiDate(leaveStartDateTime)
  const endStr   = thaiDate(leaveEndDateTime)
  const appUrl   = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const detailUrl = `${appUrl}/en/leave-request/${leaveRequestId}/edit`

  const subject = `[อนุมัติแล้ว] คำขอลา ${leaveTypeName} ${daysStr} วัน`

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#16a34a;padding:24px 32px">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">✅ คำขอลาได้รับการอนุมัติแล้ว</p>
            <p style="margin:4px 0 0;font-size:13px;color:#bbf7d0">ระบบจัดการวันลา</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151">
              เรียนคุณ <strong>${employeeName}</strong> คำขอลาของคุณได้รับการอนุมัติเรียบร้อยแล้ว
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:#f9fafb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;width:140px">ประเภทการลา</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${leaveTypeName}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่เริ่ม</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${startStr}</td>
              </tr>
              <tr style="background:#f9fafb;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่สิ้นสุด</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${endStr}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">จำนวนวัน</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:700;color:#16a34a">${daysStr} วัน</td>
              </tr>
            </table>
            <div style="margin-top:24px;text-align:center">
              <a href="${detailUrl}" style="display:inline-block;padding:12px 28px;background:#16a34a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">
                ดูรายละเอียดคำขอลา →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
              อีเมลนี้ส่งอัตโนมัติจากระบบจัดการวันลา · รหัสคำขอ: ${leaveRequestId.slice(0, 8)}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = `คำขอลาของคุณได้รับการอนุมัติแล้ว\nประเภทการลา: ${leaveTypeName}\nวันที่: ${startStr} – ${endStr}\nจำนวน: ${daysStr} วัน\n\nดูรายละเอียด: ${detailUrl}`

  return { subject, html, text }
}

// ── Leave Request Email ───────────────────────────────────────────────────────

export type LeaveRequestMailData = {
  employeeName:       string
  leaveTypeName:      string
  totalDays:          number
  leaveStartDateTime: Date
  leaveEndDateTime:   Date
  reason?:            string | null
  leaveRequestId:     string
}

export function buildLeaveRequestEmail(data: LeaveRequestMailData): { subject: string; html: string; text: string } {
  const {
    employeeName, leaveTypeName, totalDays,
    leaveStartDateTime, leaveEndDateTime, reason, leaveRequestId,
  } = data

  const daysStr = Number.isInteger(totalDays) ? `${totalDays}` : parseFloat(totalDays.toFixed(2)).toString()
  const startStr = thaiDate(leaveStartDateTime)
  const endStr   = thaiDate(leaveEndDateTime)
  const appUrl   = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const reviewUrl = `${appUrl}/en/leave-request/${leaveRequestId}/edit`

  const subject = `[คำขอลา] ${employeeName} — ${leaveTypeName} ${daysStr} วัน`

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:24px 32px">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">📋 คำขอลาใหม่</p>
            <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe">ระบบจัดการวันลา</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151">
              มีคำขอลาใหม่รอการพิจารณา กรุณาตรวจสอบและดำเนินการ
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:#f9fafb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;width:140px">พนักงาน</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:600;color:#111827">${employeeName}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">ประเภทการลา</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${leaveTypeName}</td>
              </tr>
              <tr style="background:#f9fafb;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่เริ่ม</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${startStr}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่สิ้นสุด</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${endStr}</td>
              </tr>
              <tr style="background:#f9fafb;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">จำนวนวัน</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:700;color:#4f46e5">${daysStr} วัน</td>
              </tr>
              ${reason ? `
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;vertical-align:top">เหตุผล</td>
                <td style="padding:10px 16px;font-size:14px;color:#374151">${reason}</td>
              </tr>` : ''}
            </table>
            <div style="margin-top:24px;text-align:center">
              <a href="${reviewUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">
                ดูคำขอและดำเนินการ →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
              อีเมลนี้ส่งอัตโนมัติจากระบบจัดการวันลา · รหัสคำขอ: ${leaveRequestId.slice(0, 8)}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = `คำขอลาใหม่\nพนักงาน: ${employeeName}\nประเภทการลา: ${leaveTypeName}\nวันที่: ${startStr} – ${endStr}\nจำนวน: ${daysStr} วัน${reason ? `\nเหตุผล: ${reason}` : ''}\n\nดูคำขอ: ${reviewUrl}`

  return { subject, html, text }
}

// ── Leave Cancel Request Email (to Admin) ────────────────────────────────────

export type LeaveCancelRequestMailData = {
  employeeName:       string
  leaveTypeName:      string
  totalDays:          number
  leaveStartDateTime: Date
  leaveEndDateTime:   Date
  reason?:            string | null
  leaveRequestId:     string
}

export function buildLeaveCancelRequestEmail(data: LeaveCancelRequestMailData): { subject: string; html: string; text: string } {
  const {
    employeeName, leaveTypeName, totalDays,
    leaveStartDateTime, leaveEndDateTime, reason, leaveRequestId,
  } = data

  const daysStr  = Number.isInteger(totalDays) ? `${totalDays}` : parseFloat(totalDays.toFixed(2)).toString()
  const startStr = thaiDate(leaveStartDateTime)
  const endStr   = thaiDate(leaveEndDateTime)
  const appUrl   = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const reviewUrl = `${appUrl}/en/leave-request/${leaveRequestId}/edit`

  const subject = `[ขอยกเลิกการลา] ${employeeName} — ${leaveTypeName} ${daysStr} วัน`

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#ea580c;padding:24px 32px">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">🔄 คำขอยกเลิกการลา</p>
            <p style="margin:4px 0 0;font-size:13px;color:#fed7aa">ระบบจัดการวันลา</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151">
              พนักงาน <strong>${employeeName}</strong> ได้ส่งคำขอยกเลิกการลา กรุณาตรวจสอบและดำเนินการ
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:#f9fafb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;width:140px">พนักงาน</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:600;color:#111827">${employeeName}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">ประเภทการลา</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${leaveTypeName}</td>
              </tr>
              <tr style="background:#f9fafb;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่เริ่ม</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${startStr}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่สิ้นสุด</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${endStr}</td>
              </tr>
              <tr style="background:#f9fafb;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">จำนวนวัน</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:700;color:#ea580c">${daysStr} วัน</td>
              </tr>
              ${reason ? `
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;vertical-align:top">เหตุผล</td>
                <td style="padding:10px 16px;font-size:14px;color:#374151">${reason}</td>
              </tr>` : ''}
            </table>
            <div style="margin-top:24px;text-align:center">
              <a href="${reviewUrl}" style="display:inline-block;padding:12px 28px;background:#ea580c;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">
                ดูคำขอและดำเนินการ →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
              อีเมลนี้ส่งอัตโนมัติจากระบบจัดการวันลา · รหัสคำขอ: ${leaveRequestId.slice(0, 8)}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = `คำขอยกเลิกการลา\nพนักงาน: ${employeeName}\nประเภทการลา: ${leaveTypeName}\nวันที่: ${startStr} – ${endStr}\nจำนวน: ${daysStr} วัน${reason ? `\nเหตุผล: ${reason}` : ''}\n\nดูคำขอ: ${reviewUrl}`

  return { subject, html, text }
}

// ── Leave Cancel Approved Email (to Employee) ─────────────────────────────────

export type LeaveCancelApprovedMailData = {
  employeeName:       string
  leaveTypeName:      string
  totalDays:          number
  leaveStartDateTime: Date
  leaveEndDateTime:   Date
  leaveRequestId:     string
}

export function buildLeaveCancelApprovedEmail(data: LeaveCancelApprovedMailData): { subject: string; html: string; text: string } {
  const { employeeName, leaveTypeName, totalDays, leaveStartDateTime, leaveEndDateTime, leaveRequestId } = data
  const daysStr  = Number.isInteger(totalDays) ? `${totalDays}` : parseFloat(totalDays.toFixed(2)).toString()
  const startStr = thaiDate(leaveStartDateTime)
  const endStr   = thaiDate(leaveEndDateTime)
  const appUrl   = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const detailUrl = `${appUrl}/en/leave-request/${leaveRequestId}/edit`

  const subject = `[ยกเลิกการลาแล้ว] ${leaveTypeName} ${daysStr} วัน`

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#6b7280;padding:24px 32px">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">🚫 การลาถูกยกเลิกแล้ว</p>
            <p style="margin:4px 0 0;font-size:13px;color:#d1d5db">ระบบจัดการวันลา</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151">
              เรียนคุณ <strong>${employeeName}</strong> คำขอยกเลิกการลาของคุณได้รับการอนุมัติเรียบร้อยแล้ว
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:#f9fafb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;width:140px">ประเภทการลา</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${leaveTypeName}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่เริ่ม</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${startStr}</td>
              </tr>
              <tr style="background:#f9fafb;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">วันที่สิ้นสุด</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${endStr}</td>
              </tr>
              <tr style="background:#ffffff;border-top:1px solid #e5e7eb">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">จำนวนวัน</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:700;color:#6b7280">${daysStr} วัน</td>
              </tr>
            </table>
            <div style="margin-top:24px;text-align:center">
              <a href="${detailUrl}" style="display:inline-block;padding:12px 28px;background:#6b7280;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">
                ดูรายละเอียดคำขอลา →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
              อีเมลนี้ส่งอัตโนมัติจากระบบจัดการวันลา · รหัสคำขอ: ${leaveRequestId.slice(0, 8)}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = `การลาถูกยกเลิกแล้ว\nประเภทการลา: ${leaveTypeName}\nวันที่: ${startStr} – ${endStr}\nจำนวน: ${daysStr} วัน\n\nดูรายละเอียด: ${detailUrl}`

  return { subject, html, text }
}
