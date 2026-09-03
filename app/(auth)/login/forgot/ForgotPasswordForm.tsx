'use client'

import { useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ForgotPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const errorMsg = searchParams.get('error')
  const successMsg = searchParams.get('success')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = (formRef.current?.elements.namedItem('email') as HTMLInputElement)?.value
    if (!email) return
    setIsLoading(true)
    formRef.current?.submit()
  }

  if (successMsg) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Email terkirim!</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
          Cek inbox Anda dan klik link reset password yang kami kirim.
        </p>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} action="/auth/reset-password" method="post" className="space-y-4" noValidate>
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email" name="email" type="email" required
          disabled={isLoading}
          className="input"
          placeholder="nama@email.com"
          autoComplete="email"
          autoFocus
        />
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary w-full">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Mengirim...
          </span>
        ) : 'Kirim Link Reset'}
      </button>
    </form>
  )
}
