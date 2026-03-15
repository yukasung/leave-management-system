import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/hr/leave-balance-report/page'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    employee?:     string
    departmentId?: string
    leaveTypeId?:  string
    year?:         string
  }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OriginalPage searchParams={searchParams} />
}
