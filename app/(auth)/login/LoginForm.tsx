'use client'

import { useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const errorFromUrl = searchParams.get('error')

  const validate = (): boolean => {
    const form = formRef.current
    if (!form) return false

    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const newErrors: typeof errors = {}

    if (!email) {
      newErrors.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Format email tidak valid'
    }

    if (!password) {
      newErrors.password = 'Password wajib diisi'
    } else if (password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validate()) return

    // Validation passed — let the browser submit the form natively.
    // This ensures cookies are set correctly by the server redirect.
    setIsLoading(true)
    formRef.current?.submit()
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      action="/auth/login"
      method="post"
      className="space-y-5"
      noValidate
    >
      {/* URL error (from server redirect) */}
      {errorFromUrl && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          Email atau password salah
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          disabled={isLoading}
          className={`input ${errors.email ? 'input-error' : ''}`}
          placeholder="nama@email.com"
        />
        {errors.email && <p className="error-text">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="label !mb-0">
            Password
          </label>
          <a href="/login/forgot" className="text-[11px] font-semibold text-[#1d6af5] hover:text-[#1558d6] transition-colors">
            Lupa password?
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={isLoading}
            className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
            placeholder="Masukkan password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            disabled={isLoading}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <p className="error-text">{errors.password}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Masuk...
          </span>
        ) : (
          'Masuk'
        )}
      </button>

      {/* Register link */}
      <p className="text-center text-sm text-gray-600">
        Belum punya akun?{' '}
        <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700">
          Daftar sekarang
        </Link>
      </p>
    </form>
  )
}
