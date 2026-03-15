import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/hr/department-leave/page'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    dateFrom?:    string
    dateTo?:      string
    leaveTypeId?: string
  }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OriginalPage searchParams={searchParams} />
}
