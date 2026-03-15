import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    dateFrom?: string
    dateTo?: string
    departmentId?: string
    leaveTypeId?: string
  }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { dateFrom, dateTo, departmentId, leaveTypeId } = await searchParams
  const q = new URLSearchParams()
  if (dateFrom)     q.set('dateFrom',     dateFrom)
  if (dateTo)       q.set('dateTo',       dateTo)
  if (departmentId) q.set('departmentId', departmentId)
  if (leaveTypeId)  q.set('leaveTypeId',  leaveTypeId)
  const qs = q.toString()
  redirect(`/${locale}/hr/leave-history${qs ? `?${qs}` : ''}`)
}
