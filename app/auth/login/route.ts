import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Rate limiting — max 10 login attempts per 15 min per IP
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const { allowed } = checkRateLimit(`login:${ip}`)
  if (!allowed) {
    redirect('/login?error=Terlalu+banyak+percobaan.+Coba+lagi+dalam+15+menit.')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('[login] Supabase error:', error.message, error.status)
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}
