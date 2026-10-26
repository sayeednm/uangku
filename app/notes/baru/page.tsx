import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserTags, getRecentTransactions } from '@/lib/catatan/queries'
import AppLayout from '@/components/layout/AppLayout'
import NoteEditor from '@/components/catatan/NoteEditor'

export const metadata = { title: 'Catatan Baru - Uangku' }

export default async function NewNotePage() {
  const supabase = await createClient()
  // Auth + editor data in parallel (RLS is enforced by the request cookie)
  const [userRes, tags, recentTransactions] = await Promise.all([
    supabase.auth.getUser(),
    getUserTags().catch(() => []),
    getRecentTransactions().catch(() => []),
  ])
  const { data: { user }, error } = userRes
  if (error || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <NoteEditor
        allTags={tags.map(t => ({ id: t.id, name: t.name }))}
        recentTransactions={recentTransactions}
      />
    </AppLayout>
  )
}
