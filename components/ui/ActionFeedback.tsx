'use client'

/**
 * Utility: read URL search params untuk menampilkan toast feedback
 * setelah server action redirect.
 * 
 * Usage: tambahkan `?success=Pesan+berhasil` atau `?error=Pesan+gagal`
 * pada redirect URL di server action, lalu render komponen ini di halaman.
 */

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from './Toast'

export default function ActionFeedback() {
  const searchParams = useSearchParams()
  const { success, error } = useToast()

  useEffect(() => {
    const s = searchParams.get('success')
    const e = searchParams.get('error')
    if (s) success(decodeURIComponent(s))
    if (e) error(decodeURIComponent(e))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
