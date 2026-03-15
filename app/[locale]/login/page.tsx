import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/login/page'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OriginalPage />
}
