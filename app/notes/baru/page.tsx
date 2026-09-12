import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTags, getRecentTransactions } from '@/lib/catatan/queries'
import AppLayout from '@/components/layout/AppLayout'
import NoteEditor from '@/components/catatan/NoteEditor'

export const metadata = { title: 'Catatan Baru - Uangku' }

export default async function NewNotePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [tags, recentTransactions] = await Promise.all([
    getUserTags().catch(() => []),
    getRecentTransactions().catch(() => []),
  ])

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <NoteEditor
        allTags={tags.map(t => ({ id: t.id, name: t.name }))}
        recentTransactions={recentTransactions}
      />
    </AppLayout>
  )
}
