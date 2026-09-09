import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ChangePasswordForm from '@/components/pengaturan/ChangePasswordForm'
import DeleteAccountButton from '@/components/pengaturan/DeleteAccountButton'

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
          <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.06]">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Akun</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Email</p>
              <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
            </div>
          </div>

          {/* Ganti Password */}
          <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.06]">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ganti Password</p>
            </div>
            <div className="px-5 py-4">
              <ChangePasswordForm />
            </div>
          </div>

          {/* Keluar */}
          <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-5 py-4">
              <form action="/auth/logout" method="post">
                <button type="submit"
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Keluar dari Akun
                </button>
              </form>
            </div>
          </div>

          {/* Bahaya Zone — Hapus Akun */}
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-red-100 dark:border-red-900/30">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Zona Bahaya</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Hapus Akun</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
                Menghapus akun akan menghapus semua data Anda secara permanen dan tidak dapat dipulihkan.
              </p>
              <DeleteAccountButton />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
