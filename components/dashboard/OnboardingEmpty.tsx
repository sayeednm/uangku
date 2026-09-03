import Link from 'next/link'
import Image from 'next/image'

export default function OnboardingEmpty() {
  const steps = [
    {
      num: '1',
      title: 'Tambah Rekening',
      desc: 'Mulai dengan menambahkan rekening bank atau dompet tunai Anda.',
      href: '/rekening/baru',
      cta: 'Tambah Rekening',
    },
    {
      num: '2',
      title: 'Catat Transaksi',
      desc: 'Catat pemasukan dan pengeluaran harian Anda.',
      href: '/transaksi/baru',
      cta: 'Catat Transaksi',
    },
    {
      num: '3',
      title: 'Lihat Laporan',
      desc: 'Analisis pola keuangan Anda dari waktu ke waktu.',
      href: '/laporan',
      cta: 'Buka Laporan',
    },
  ]

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <Image src="/logo.png" alt="Uangku" width={72} height={72} className="rounded-2xl" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Selamat datang di Uangku!
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
          Mulai kelola keuangan Anda dalam 3 langkah mudah.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.num}
            className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-4 flex items-start gap-4"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-500 dark:text-gray-400">
              {step.num}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
            <Link
              href={step.href}
              className="flex-shrink-0 text-xs font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-white/20 px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
            >
              {step.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
