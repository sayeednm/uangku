import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  poweredByHeader: false,
}

export default nextConfig
