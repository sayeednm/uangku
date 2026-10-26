import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  poweredByHeader: false,
  experimental: {
    // Keep the router cache of dynamic (authed) pages for 30s so switching
    // between features re-uses the already-fetched page instead of re-render
    // on the server every tap. Server actions still revalidate their paths,
    // so saved data never goes stale beyond the action's own refresh.
    staleTimes: { dynamic: 30, static: 180 },
  },
}

export default nextConfig
