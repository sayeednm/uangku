import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // next param controls where to go after auth
      // For password reset: next=/update-password
      // For email verification: next=/dashboard (with welcome)
      const destination = next === '/dashboard'
        ? `${requestUrl.origin}/dashboard?success=Akun+berhasil+diverifikasi`
        : `${requestUrl.origin}${next}`
      return NextResponse.redirect(destination)
    }

    // Auth failed — redirect to login with error
    return NextResponse.redirect(`${requestUrl.origin}/login?error=Link+tidak+valid+atau+sudah+kadaluarsa`)
  }

  // No code — redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
