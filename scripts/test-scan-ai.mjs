/**
 * Test the scan-receipt AI extraction pipeline directly.
 * - Loads GOOGLE_AI_API_KEY from .env.local
 * - Draws a synthetic receipt PNG (pure Node stdlib, no deps)
 * - Sends it to the same model/prompt as app/api/scan-receipt/route.ts
 *
 * Usage: node scripts/test-scan-ai.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ── Load env ─────────────────────────────────────────────────────────────────
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const apiKey = envText.match(/^GOOGLE_AI_API_KEY=(.+)$/m)?.[1]?.trim()
if (!apiKey) {
  console.error('FAIL: GOOGLE_AI_API_KEY not found in .env.local')
  process.exit(1)
}

// ── Tiny 5x7 pixel font (only the chars we need) ─────────────────────────────
const FONT = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  G: ['01110','10001','10000','10111','10001','10001','01110'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','00010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00110','01000','10000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '6': ['01110','10000','11110','10001','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00001','01110'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  '/': ['00001','00010','00010','00100','01000','01000','10000'],
  ':': ['00000','01100','01100','00000','01100','01100','00000'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
}

const W = 640, H = 880, SCALE = 4
const px = Buffer.alloc(W * H, 255) // white background, 8-bit grayscale

function drawText(text, x0, y0) {
  let x = x0
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[' ']
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] === '1') {
          for (let sy = 0; sy < SCALE; sy++)
            for (let sx = 0; sx < SCALE; sx++) {
              const px_ = x + gx * SCALE + sx
              const py = y0 + gy * SCALE + sy
              if (px_ < W && py < H) px[py * W + px_] = 0
            }
        }
      }
    }
    x += 6 * SCALE
  }
}

const lines = [
  ['INDOMARET MATARAM', 40, 60],
  ['JL. MERDEKA NO. 10', 40, 130],
  ['12/09/2026 14:35', 40, 200],
  ['AQUA 600ML      4.500', 40, 300],
  ['INDOMIE GORENG  3.500', 40, 370],
  ['TEH KOTAK       2.000', 40, 440],
  ['TOTAL RP 10.000', 40, 560],
  ['TUNAI RP 10.000', 40, 650],
]
for (const [t, x, y] of lines) drawText(t, x, y)

// ── Minimal PNG encoder (grayscale, color type 0) ────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8   // bit depth
ihdr[9] = 0   // grayscale
const raw = Buffer.alloc(H * (W + 1))
for (let y = 0; y < H; y++) {
  raw[y * (W + 1)] = 0 // filter: none
  px.copy(raw, y * (W + 1) + 1, y * W, (y + 1) * W)
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
const outPath = join(tmpdir(), 'struk-test.png')
writeFileSync(outPath, png)
console.log(`Receipt PNG written: ${outPath} (${(png.length / 1024).toFixed(0)} KB)`)

// ── Call Gemini — same model + prompt as the API route ───────────────────────
const prompt = `Kamu adalah asisten keuangan. Analisis foto struk/bukti pembayaran ini dan ekstrak informasi berikut dalam format JSON.

Kembalikan HANYA JSON, tidak ada teks lain:
{
  "amount": <nominal total dalam angka integer, contoh: 50000>,
  "description": "<nama toko atau deskripsi singkat pembelian, max 50 karakter>",
  "date": "<tanggal transaksi format YYYY-MM-DD, atau null jika tidak ada>",
  "category": "<kategori yang paling sesuai dari list ini: Makanan, Transportasi, Belanja, Tagihan, Rumah, Kesehatan, Hiburan, Pendidikan, Pakaian, Keluarga, Lainnya>",
  "confidence": <0.0 sampai 1.0 seberapa yakin hasil ekstraksi>
}

Jika tidak bisa membaca struk atau gambar bukan struk, kembalikan:
{"error": "Tidak dapat membaca struk"}

Fokus pada nominal TOTAL yang harus dibayar (bukan subtotal atau pajak terpisah).`

console.log('Calling gemini-3.6-flash...')
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/png', data: readFileSync(outPath).toString('base64') } },
        ],
      }],
    }),
  }
)

console.log(`HTTP ${res.status}`)
const json = await res.json()

if (!res.ok) {
  console.error('API error:', JSON.stringify(json).substring(0, 500))
  process.exit(1)
}

const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? ''
console.log('Raw model output:', text.substring(0, 300))

try {
  const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  console.log('Parsed:', JSON.stringify(parsed, null, 2))
  const ok = parsed.amount === 10000
  console.log(ok ? 'PASS: amount correctly extracted as 10000' : `CHECK: expected amount 10000, got ${parsed.amount}`)
} catch {
  console.error('FAIL: could not parse model output as JSON')
  process.exit(1)
}
