/**
 * Simple icon generator — creates placeholder PNG icons for PWA
 * using only Node.js built-ins (no canvas/sharp needed).
 * 
 * These are minimal valid PNG files with a solid dark background.
 * Replace with proper icons before production.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(publicDir, { recursive: true })

// Minimal 1x1 PNG (dark gray #111827) encoded as base64
// We'll create proper-sized PNGs using raw PNG format

function createPNG(size, bgR, bgG, bgB) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  function uint32BE(n) {
    const b = Buffer.alloc(4)
    b.writeUInt32BE(n)
    return b
  }

  function crc32(data) {
    let crc = 0xFFFFFFFF
    const table = []
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      table[i] = c
    }
    for (const byte of data) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii')
    const len = uint32BE(data.length)
    const crcData = Buffer.concat([typeBytes, data])
    const crcVal = uint32BE(crc32(crcData))
    return Buffer.concat([len, typeBytes, data, crcVal])
  }

  // IHDR: width, height, bitDepth=8, colorType=2(RGB), compression=0, filter=0, interlace=0
  const ihdr = chunk('IHDR', Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0])
  ]))

  // IDAT: raw RGB pixels with filter byte per row
  // Simple solid color fill
  const { deflateSync } = await import('zlib').catch(() => require('zlib'))
  const rowSize = 1 + size * 3 // filter byte + RGB per pixel
  const raw = Buffer.alloc(size * rowSize)
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize
    raw[rowStart] = 0 // filter type None
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3
      raw[px] = bgR
      raw[px + 1] = bgG
      raw[px + 2] = bgB
    }
  }
  const compressed = deflateSync(raw)
  const idat = chunk('IDAT', compressed)
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

// Dark background: #111827 = rgb(17, 24, 39)
const png192 = await createPNG(192, 17, 24, 39)
const png512 = await createPNG(512, 17, 24, 39)

writeFileSync(join(publicDir, 'icon-192.png'), png192)
writeFileSync(join(publicDir, 'icon-512.png'), png512)

console.log('Icons generated successfully')
