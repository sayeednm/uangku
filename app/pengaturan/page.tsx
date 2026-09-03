import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ChangePasswordForm from '@/components/pengaturan/ChangePasswordForm'

export default async function PengaturanPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Pengaturan</h1>

        <div className="space-y-4">
          {/* Akun */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Akun</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</p>
              <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
            </div>
          </div>

          {/* Ganti Password */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ganti Password</p>
            </div>
            <div className="px-5 py-4">
              <ChangePasswordForm />
            </div>
          </div>

          {/* Keamanan */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Keamanan</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Sesi Aktif</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Keluar dari semua perangkat dengan menggunakan tombol keluar.
              </p>
            </div>
          </div>

          {/* Keluar */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4">
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="text-sm font-medium text-danger-600 hover:text-danger-700 transition-colors"
                >
                  Keluar dari Akun
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
