import { setRequestLocale } from 'next-intl/server'
import OriginalPage from '@/app/admin/employees/[id]/page'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function Page({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  return <OriginalPage params={Promise.resolve({ id })} />
}
