import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/admin/settings/leave-types/page'

type Props = { params: Promise<{ locale: string }> }

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OriginalPage />
}
