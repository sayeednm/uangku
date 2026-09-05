import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { ToastProvider } from "@/components/ui/Toast"
import SplashScreen from "@/components/pwa/SplashScreen"
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Uangku - Kelola Keuangan Pribadi",
  description: "Aplikasi manajemen keuangan pribadi yang sederhana dan mudah digunakan",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Uangku",
    startupImage: "/logo.png",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#1d6af5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* iOS PWA */}
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Uangku" />
        {/* Android */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Uangku" />
        {/* MS */}
        <meta name="msapplication-TileColor" content="#1d6af5" />
        <meta name="msapplication-TileImage" content="/logo.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <ServiceWorkerRegister />
            <SplashScreen />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
