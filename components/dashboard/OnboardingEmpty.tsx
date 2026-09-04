import Link from 'next/link'
import Image from 'next/image'

export default function OnboardingEmpty() {
  return (
    <div className="animate-fade-up space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-8 text-center"
        style={{
          background: 'linear-gradient(135deg, #1040a8 0%, #1d6af5 50%, #3b82f6 100%)',
          boxShadow: '0 12px 40px rgba(29,106,245,0.4)',
        }}
      >
        {/* Decorative circles */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: -20, left: -20,
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        {/* Logo */}
        <div className="relative flex justify-center mb-4">
          <div
            className="animate-float"
            style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}
          >
            <Image
              src="/logo.png"
              alt="Uangku"
              width={80}
              height={80}
              className="rounded-[24px]"
              priority
            />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2 leading-tight">
          Selamat datang di Uangku!
        </h2>
        <p className="text-sm text-white/70 max-w-xs mx-auto leading-relaxed">
          Mulai kelola keuangan pribadi Anda. Hanya butuh 3 langkah mudah.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {[
          {
            num: 1,
            icon: '🏦',
            title: 'Tambah Rekening',
            desc: 'Daftarkan rekening bank, dompet tunai, atau e-wallet Anda.',
            href: '/rekening/baru',
            cta: 'Mulai',
            color: '#1d6af5',
            bg: 'rgba(29,106,245,0.08)',
          },
          {
            num: 2,
            icon: '📝',
            title: 'Catat Transaksi',
            desc: 'Catat pemasukan dan pengeluaran setiap hari.',
            href: '/transaksi/baru',
            cta: 'Catat',
            color: '#10b981',
            bg: 'rgba(16,185,129,0.08)',
          },
          {
            num: 3,
            icon: '📊',
            title: 'Lihat Laporan',
            desc: 'Analisis pola keuangan Anda dari waktu ke waktu.',
            href: '/laporan',
            cta: 'Buka',
            color: '#8b5cf6',
            bg: 'rgba(139,92,246,0.08)',
          },
        ].map((step, i) => (
          <div
            key={step.num}
            className="animate-fade-up bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-4 flex items-center gap-4"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Icon circle */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: step.bg }}
            >
              {step.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: step.color }}
                >
                  {step.num}
                </span>
                <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                  {step.title}
                </p>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                {step.desc}
              </p>
            </div>

            {/* CTA */}
            <Link
              href={step.href}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all duration-150 active:scale-95"
              style={{
                backgroundColor: step.color,
                boxShadow: `0 2px 8px ${step.color}40`,
              }}
            >
              {step.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Skip hint */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        Sudah punya data?{' '}
        <Link href="/rekening" className="font-semibold text-[#1d6af5] hover:opacity-80 transition-opacity">
          Lihat rekening →
        </Link>
      </p>
    </div>
  )
}
