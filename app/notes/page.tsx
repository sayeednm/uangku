import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import NotesClient from './NotesClient'

export const metadata = { title: 'Catatan - Uangku' }

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <NotesClient />
    </AppLayout>
  )
}
