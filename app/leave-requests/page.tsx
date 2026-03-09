import { redirect } from 'next/navigation'

export default async function LeaveRequestsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.status) q.set('status', params.status)
  if (params.page)   q.set('page', params.page)
  const qs = q.toString()
  redirect(`/hr/leave-requests${qs ? `?${qs}` : ''}`)
}
