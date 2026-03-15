import { redirect } from 'next/navigation'

type SearchParams = {
  dateFrom?:     string
  dateTo?:       string
  departmentId?: string
  leaveTypeId?:  string
}

export default async function LeaveSummaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { dateFrom, dateTo, departmentId, leaveTypeId } = await searchParams
  const q = new URLSearchParams()
  if (dateFrom)     q.set('dateFrom',     dateFrom)
  if (dateTo)       q.set('dateTo',       dateTo)
  if (departmentId) q.set('departmentId', departmentId)
  if (leaveTypeId)  q.set('leaveTypeId',  leaveTypeId)
  const qs = q.toString()
  redirect(`/hr/leave-history${qs ? `?${qs}` : ''}`)
}
