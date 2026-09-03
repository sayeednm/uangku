import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get('email') as string

  if (!email) {
    redirect('/login?error=Email+wajib+diisi')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${request.nextUrl.origin}/auth/update-password`,
  })

  if (error) {
    console.error('[reset-password]', error.message)
    redirect('/login/forgot?error=Gagal+mengirim+email')
  }

  redirect('/login/forgot?success=Email+reset+telah+dikirim')
}
