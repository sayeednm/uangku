import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNoteById, getUserTags, getRecentTransactions } from '@/lib/catatan/queries'
import AppLayout from '@/components/layout/AppLayout'
import NoteEditor from '@/components/catatan/NoteEditor'

export const metadata = { title: 'Edit Catatan - Uangku' }

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  // Auth + note + editor data in parallel (RLS is enforced by the request cookie)
  const [userRes, note, tags, recentTransactions] = await Promise.all([
    supabase.auth.getUser(),
    getNoteById(id).catch(() => null),
    getUserTags().catch(() => []),
    getRecentTransactions().catch(() => []),
  ])
  const { data: { user }, error } = userRes
  if (error || !user) redirect('/login')

  if (!note) notFound()

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
