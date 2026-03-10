import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/hr/pending-leave/page'

type Props = {
  params:       Promise<{ locale: string }>
  searchParams: Promise<{
    approverId?:   string
    departmentId?: string
    dateFrom?:     string
    dateTo?:       string
    dir?:          string
  }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OriginalPage searchParams={searchParams} />
}
