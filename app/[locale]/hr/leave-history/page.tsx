import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/hr/leave-history/page'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    employee?:     string
    dateFrom?:     string
    dateTo?:       string
    leaveTypeId?:  string
    status?:       string
    departmentId?: string
    sort?:         string
    dir?:          string
    page?:         string
  }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OriginalPage searchParams={searchParams} />
}
