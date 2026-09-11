import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Allow up to 60s on Vercel for the Gemini call (default is 10s on Hobby,
// which would kill slow AI responses mid-flight)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI tidak dikonfigurasi' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Gambar tidak ditemukan' }, { status: 400 })
    }

    // Validate file
    if (file.size === 0) {
      return NextResponse.json({ error: 'File kosong' }, { status: 400 })
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Foto terlalu besar (max 4MB). Coba lagi.' }, { status: 400 })
    }
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 })
    }

    console.log('[scan-receipt] file:', file.name, file.size, file.type)

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // Call Gemini Vision
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

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

    // Retry transient upstream failures (503 overload, 429 rate limit).
    // Gemini occasionally returns 503 under load — without this, the user's
    // scan fails outright and they must repeat the whole capture.
    let responseText = ''
    const MAX_ATTEMPTS = 3
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ])
        responseText = result.response.text().trim()
        break
      } catch (aiErr) {
        const status = (aiErr as { status?: number })?.status
        const transient = status === 503 || status === 429 || status === 500
        console.error(`[scan-receipt] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, status ?? aiErr)
        if (!transient || attempt === MAX_ATTEMPTS) throw aiErr
        await new Promise(r => setTimeout(r, attempt * 1500))
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: 'Layanan AI sedang sibuk. Coba lagi sebentar.' },
        { status: 503 }
      )
    }

    console.log('[scan-receipt] Gemini response:', responseText.substring(0, 200))

    // Parse JSON response
    let parsed
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Gagal membaca struk. Coba foto yang lebih jelas.' }, { status: 422 })
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 })
    }

    // Sanitize Gemini output before returning it to the form
    const amount = Math.round(Number(parsed.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Nominal tidak terbaca. Coba foto yang lebih jelas.' },
        { status: 422 }
      )
    }

    const VALID_CATEGORIES = [
      'Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Rumah', 'Kesehatan',
      'Hiburan', 'Pendidikan', 'Pakaian', 'Keluarga', 'Lainnya',
    ]
    const requested = typeof parsed.category === 'string' ? parsed.category.trim() : ''
    const category = VALID_CATEGORIES.find(c => c.toLowerCase() === requested.toLowerCase()) ?? 'Lainnya'

    // Only accept well-formed dates (YYYY-MM-DD); anything else is ignored
    // and the form falls back to today.
    const rawDate = typeof parsed.date === 'string' ? parsed.date.substring(0, 10) : null
    const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null

    return NextResponse.json({
      amount,
      description: typeof parsed.description === 'string' ? parsed.description.substring(0, 200) : '',
      date,
      category,
      confidence: Number(parsed.confidence) || 0,
    })
  } catch (err) {
    console.error('[scan-receipt]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
