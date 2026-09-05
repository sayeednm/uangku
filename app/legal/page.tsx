import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan & Ketentuan - Uangku',
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#F0F4FF] dark:bg-[#0A0C14] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#1d6af5] hover:opacity-80 transition-opacity">
            ← Kembali
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
            Kebijakan & Ketentuan
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Terakhir diperbarui: September 2026
          </p>
        </div>

        <div className="space-y-6">
          {/* Terms of Service */}
          <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Syarat & Ketentuan Penggunaan
            </h2>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">1. Penerimaan Ketentuan</h3>
                <p>Dengan menggunakan aplikasi Uangku, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, harap tidak menggunakan layanan kami.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">2. Deskripsi Layanan</h3>
                <p>Uangku adalah aplikasi manajemen keuangan pribadi yang membantu pengguna mencatat, melacak, dan menganalisis keuangan mereka. Layanan ini disediakan "sebagaimana adanya" tanpa jaminan apapun.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">3. Akun Pengguna</h3>
                <p>Anda bertanggung jawab untuk menjaga kerahasiaan password akun Anda. Anda bertanggung jawab atas semua aktivitas yang terjadi di bawah akun Anda.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">4. Data Keuangan</h3>
                <p>Data keuangan yang Anda masukkan ke Uangku adalah milik Anda sepenuhnya. Kami tidak menggunakan data keuangan Anda untuk tujuan komersial atau berbagi dengan pihak ketiga.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">5. Batasan Layanan</h3>
                <p>Uangku bukan lembaga keuangan dan tidak menyediakan layanan perbankan, investasi, atau nasihat keuangan. Gunakan aplikasi ini hanya sebagai alat pencatatan keuangan pribadi.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">6. Penghentian Akun</h3>
                <p>Kami berhak menghentikan atau menangguhkan akun Anda jika terbukti melanggar ketentuan penggunaan ini.</p>
              </div>
            </div>
          </div>

          {/* Privacy Policy */}
          <div className="bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.08] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Kebijakan Privasi
            </h2>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">1. Data yang Kami Kumpulkan</h3>
                <p>Kami mengumpulkan: alamat email untuk autentikasi, dan data keuangan yang Anda masukkan secara sukarela (transaksi, rekening, kategori).</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">2. Penggunaan Data</h3>
                <p>Data Anda digunakan semata-mata untuk menyediakan layanan Uangku kepada Anda. Kami tidak menjual, menyewakan, atau berbagi data pribadi Anda kepada pihak ketiga.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">3. Keamanan Data</h3>
                <p>Data Anda disimpan secara aman menggunakan layanan Supabase dengan enkripsi standar industri. Setiap pengguna hanya dapat mengakses data miliknya sendiri.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">4. Penyimpanan Data</h3>
                <p>Data Anda disimpan selama akun Anda aktif. Jika Anda menghapus akun, semua data terkait akan dihapus secara permanen.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">5. Hak Pengguna</h3>
                <p>Anda berhak mengakses, mengubah, atau menghapus data pribadi Anda kapan saja melalui pengaturan akun.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">6. Kontak</h3>
                <p>Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, hubungi kami melalui halaman kontak di aplikasi.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
