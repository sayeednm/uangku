import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

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
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { ThemeProvider } from "@/components/ThemeProvider"
import { ToastProvider } from "@/components/ui/Toast"
import SplashScreen from "@/components/pwa/SplashScreen"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <SplashScreen />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
