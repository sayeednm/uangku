'use client'

import { useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterForm() {
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const errorFromUrl = searchParams.get('error')
  const infoFromUrl = searchParams.get('info')

  // ── Email confirmation required state ──────────────────────────────────────
  if (infoFromUrl === 'check-email') {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#1d6af5]/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-[#1d6af5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-white">Cek email Anda</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
            Kami telah mengirim link verifikasi ke email Anda. Klik link tersebut untuk mengaktifkan akun.
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-[#1d6af5]/10 border border-blue-100 dark:border-[#1d6af5]/20 rounded-xl p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Tidak menerima email? Periksa folder spam atau{' '}
            <Link href="/register" className="font-semibold underline">coba daftar ulang</Link>
          </p>
        </div>
        <Link href="/login" className="block text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Kembali ke Login
        </Link>
      </div>
    )
  }

  const validate = (): boolean => {
    const form = formRef.current
    if (!form) return false
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
    const newErrors: typeof errors = {}

    if (!email) newErrors.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Format email tidak valid'
    if (!password) newErrors.password = 'Password wajib diisi'
    else if (password.length < 6) newErrors.password = 'Password minimal 6 karakter'
    if (!confirmPassword) newErrors.confirmPassword = 'Konfirmasi password wajib diisi'
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Password tidak cocok'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    formRef.current?.submit()
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  return (
    <form ref={formRef} onSubmit={handleSubmit} action="/auth/signup" method="post" className="space-y-4" noValidate>
      {errorFromUrl && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {decodeURIComponent(errorFromUrl)}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email"
          disabled={isLoading}
          className={`input ${errors.email ? 'input-error' : ''}`}
          placeholder="nama@email.com" />
        {errors.email && <p className="error-text">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="label">Password</label>
        <div className="relative">
          <input id="password" name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password" disabled={isLoading}
            className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
            placeholder="Minimal 6 karakter" />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'} disabled={isLoading}>
            <EyeIcon open={showPassword} />
          </button>
        </div>
        {errors.password && <p className="error-text">{errors.password}</p>}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="label">Konfirmasi Password</label>
        <div className="relative">
          <input id="confirmPassword" name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password" disabled={isLoading}
            className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
            placeholder="Ulangi password" />
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={showConfirm ? 'Sembunyikan' : 'Tampilkan'} disabled={isLoading}>
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary w-full mt-1">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Membuat akun...
          </span>
        ) : 'Daftar'}
      </button>

      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
        Dengan mendaftar, Anda menyetujui{' '}
        <Link href="/legal" className="text-[#1d6af5] hover:opacity-80 transition-opacity">
          Syarat & Ketentuan
        </Link>{' '}
        dan{' '}
        <Link href="/legal" className="text-[#1d6af5] hover:opacity-80 transition-opacity">
          Kebijakan Privasi
        </Link>{' '}
        kami.
      </p>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-semibold text-[#1d6af5] hover:text-[#1558d6] transition-colors">
          Masuk di sini
        </Link>
      </p>
    </form>
  )
}
