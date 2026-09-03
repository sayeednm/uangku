import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const password = formData.get('password') as string

  if (!password || password.length < 6) {
    redirect('/update-password?error=Password+minimal+6+karakter')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[update-password]', error.message)
    redirect('/update-password?error=Gagal+memperbarui+password')
  }

  redirect('/dashboard?success=Password+berhasil+diperbarui')
}
