'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmSheet from '@/components/ui/ConfirmSheet'

export default function DeleteAccountButton() {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsPending(true)
    setError(null)

    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Gagal menghapus akun')
        setShowConfirm(false)
        setIsPending(false)
        return
      }

      // Redirect to login after deletion
      router.push('/login?success=Akun+berhasil+dihapus')
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
      setShowConfirm(false)
      setIsPending(false)
    }
  }

  return (
    <>
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
      >
        Hapus Akun Saya
      </button>

      <ConfirmSheet
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        isPending={isPending}
        title="Hapus akun secara permanen?"
        description="Semua data Anda (transaksi, rekening, kategori) akan dihapus selamanya dan tidak bisa dipulihkan."
        confirmLabel="Ya, Hapus Akun"
        danger
      />
    </>
  )
}
