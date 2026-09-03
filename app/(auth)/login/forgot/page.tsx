import { Suspense } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthCard from '@/components/auth/AuthCard'
import ForgotPasswordForm from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Lupa Password
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          Masukkan email Anda untuk menerima link reset password
        </p>
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </AuthCard>
      <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
        <Link href="/login" className="font-semibold text-[#1d6af5] hover:text-[#1558d6] transition-colors">
          ← Kembali ke Login
        </Link>
      </p>
    </AuthLayout>
  )
}
