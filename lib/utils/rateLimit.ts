/**
 * Simple in-memory rate limiter for auth routes.
 * Resets on server restart — suitable for Vercel serverless.
 * For production at scale, use Redis or Upstash.
 */

const attempts = new Map<string, { count: number; firstAttempt: number }>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 10 // max attempts per window

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = attempts.get(identifier)

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    // New window
    attempts.set(identifier, { count: 1, firstAttempt: now })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count }
}

export function clearRateLimit(identifier: string): void {
  attempts.delete(identifier)
}
