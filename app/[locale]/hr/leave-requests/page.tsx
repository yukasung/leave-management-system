import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/hr/leave-requests/page'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OriginalPage searchParams={searchParams} />
}
