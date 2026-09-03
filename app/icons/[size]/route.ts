import { NextRequest, NextResponse } from 'next/server'

// Serves a minimal SVG as the app icon
// Replace with actual PNG files in /public/icons/ for production
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params
  const px = size === '512' ? 512 : 192

  const svg = `<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${px}" height="${px}" rx="${Math.round(px * 0.22)}" fill="#111827"/>
  <text x="${px / 2}" y="${px * 0.67}" font-family="system-ui,-apple-system,sans-serif" font-size="${px * 0.46}" font-weight="700" fill="white" text-anchor="middle">U</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
