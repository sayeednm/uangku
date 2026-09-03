import { Suspense } from 'react'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthCard from '@/components/auth/AuthCard'
import UpdatePasswordForm from './UpdatePasswordForm'

export default function UpdatePasswordPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Buat Password Baru
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          Masukkan password baru Anda
        </p>
        <Suspense fallback={null}>
          <UpdatePasswordForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  )
}
