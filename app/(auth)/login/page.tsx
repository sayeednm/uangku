import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthCard from '@/components/auth/AuthCard'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <AuthLayout>
      <AuthCard>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Masuk
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          Masukkan email dan password Anda
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  )
}
