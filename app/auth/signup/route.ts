import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
      data: {
        app_name: 'Uangku',
      },
    },
  })

  if (error) {
    console.error('[signup] Supabase error:', error.message, error.status)
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  // Supabase returns a user but with no session when email confirmation is required
  if (data.user && !data.session) {
    console.log('[signup] Email confirmation required for:', email)
    redirect('/register?info=check-email')
  }

  redirect('/dashboard')
}
