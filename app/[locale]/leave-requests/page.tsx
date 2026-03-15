import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { search, status, page } = await searchParams
  const q = new URLSearchParams()
  if (search) q.set('search', search)
  if (status) q.set('status', status)
  if (page)   q.set('page',   page)
  const qs = q.toString()
  redirect(`/${locale}/hr/leave-requests${qs ? `?${qs}` : ''}`)
}
