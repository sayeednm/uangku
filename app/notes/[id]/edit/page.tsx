import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNoteById, getUserTags, getRecentTransactions } from '@/lib/catatan/queries'
import AppLayout from '@/components/layout/AppLayout'
import NoteEditor from '@/components/catatan/NoteEditor'

export const metadata = { title: 'Edit Catatan - Uangku' }

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const note = await getNoteById(id)
  if (!note) notFound()

  const [tags, recentTransactions] = await Promise.all([
    getUserTags().catch(() => []),
    getRecentTransactions().catch(() => []),
  ])

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <NoteEditor
        note={note}
        allTags={tags.map(t => ({ id: t.id, name: t.name }))}
        recentTransactions={recentTransactions}
      />
    </AppLayout>
  )
}
