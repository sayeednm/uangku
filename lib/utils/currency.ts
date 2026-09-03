/**
 * Currency utilities for Uangku
 * All monetary amounts are stored as BIGINT in the database
 * representing the smallest currency unit (Rupiah)
 */

/**
 * Format a number (in Rupiah) to Indonesian Rupiah currency string
 * @param amount - Amount in Rupiah (not cents)
 * @returns Formatted currency string (e.g., "Rp 100.000")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number (in Rupiah) to a compact string
 * @param amount - Amount in Rupiah
 * @returns Compact string (e.g., "100rb", "1,5jt")
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`
  }
  return `Rp ${amount}`
}

/**
 * Parse a currency string to number (Rupiah)
 * Handles various input formats
 * @param value - String representation of currency
 * @returns Amount in Rupiah
 */
export function parseCurrency(value: string): number {
  // Remove all non-digit characters except decimal point
  const cleaned = value.replace(/[^\d.,]/g, '')
  // Handle Indonesian format (1.000.000,00) and English format (1,000,000.00)
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const amount = parseFloat(normalized)
  return isNaN(amount) ? 0 : Math.round(amount)
}

/**
 * Validate if a value is a valid monetary amount
 * @param value - Value to validate
 * @returns true if valid, false otherwise
 */
export function isValidAmount(value: number): boolean {
  return !isNaN(value) && isFinite(value) && value > 0
}
