import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const initial = (user.email ?? 'U').charAt(0).toUpperCase()
  const createdAt = new Date(user.created_at).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <AppLayout userEmail={user.email ?? ''}>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Profil</h1>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 text-2xl font-bold flex items-center justify-center flex-shrink-0">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user.email}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Bergabung {createdAt}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Info rows */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</p>
              <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">ID Akun</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-mono truncate">{user.id}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Terakhir Masuk</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : '-'}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Untuk mengubah email atau password, gunakan halaman Pengaturan.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
