import { ReactNode } from 'react'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A0C14] flex flex-col items-center justify-center px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Uangku"
              width={72}
              height={72}
              className="rounded-2xl"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Uangku
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Kelola keuangan dengan mudah
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
