import { createClient } from '@/lib/supabase/server'
import { checkAiRateLimit } from '@/lib/utils/rateLimit'
import { NextResponse, NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60

const VALID_TYPES = ['income', 'expense']

/**
 * Parse free-form spoken text (e.g. "beli jajan 20 ribu") into a structured
 * transaction draft. Mirrors the scan-receipt route: auth check, Gemini call
 * with retry, then sanitize the returned JSON before trusting any field.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Per-user cap on expensive Gemini calls (abuse protection)
  if (!checkAiRateLimit(user.id).allowed) {
    return NextResponse.json({ error: 'Terlalu sering. Tunggu sebentar lagi, ya.' }, { status: 429 })
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI tidak dikonfigurasi' }, { status: 500 })
  }

  let text = ''
  try {
    const body = await request.json()
    text = typeof body?.text === 'string' ? body.text : ''
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'Teks tidak boleh kosong' }, { status: 400 })
  }
  if (text.length > 500) {
    text = text.substring(0, 500)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const prompt = `Kamu adalah asisten keuangan. Ubah kalimat lisan user (bahasa Indonesia santai, hasil speech-to-text) menjadi data transaksi dalam format JSON.

PERHATIKAN:
- Angka bisa disebut dengan kata: "20 ribu" = 20000, "2 juta" = 2000000, "dua belas setengah ribu" = 12500, "7 k" = 7000.
- Kalimat bisa present tense atau lampau ("kena kopi 30 ribu", "dapet gaji 3 juta").

Kembalikan HANYA JSON, tidak ada teks lain:
{
  "type": "expense" jika uang keluar/pengeluaran, atau "income" jika uang masuk/pemasukan/gaji/bonus,
  "amount": <nominal dalam angka integer, contoh: 20000>,
  "description": "<deskripsi singkat pembelian, max 50 karakter>",
  "category": "<kategori yang paling sesuai dari list di bawah>",
  "confidence": <0.0 sampai 1.0 seberapa yakin hasil ekstraksi>
}

Jika kalimat tidak mengandung transaksi uang (tidak ada nominal), kembalikan:
{"error": "Tidak ada nominal yang terdeteksi"}

Contoh:
- "beli jajan 20 ribu" → {"type":"expense","amount":20000,"description":"Jajan","category":"Makanan","confidence":0.9}
- "dapat gaji 3 juta" → {"type":"income","amount":3000000,"description":"Gaji","category":"Gaji","confidence":0.95}`
    const result = await model.generateContent([
      { text: prompt },
      { text: `Kalimat user: "${text}"\n\nDaftar kategori pengeluaran yang valid: Makanan, Transportasi, Belanja, Tagihan, Rumah, Kesehatan, Hiburan, Pendidikan, Pakaian, Keluarga, Lainnya.` },
      { text: 'Daftar kategori pemasukan yang valid: Gaji, Bonus, Hadiah, Investasi, Lainnya.' },
    ])
    const responseText = result.response.text().trim()

    let parsed
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Gagal membaca kalimat. Coba ucapkan lagi.' }, { status: 422 })
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 })
    }

    const amount = Math.round(Number(parsed.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Nominal tidak terdeteksi. Coba sebutkan nominalnya jelas.' },
        { status: 422 }
      )
    }

    const VALID_CATEGORIES = [
      'Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Rumah', 'Kesehatan',
      'Hiburan', 'Pendidikan', 'Pakaian', 'Keluarga', 'Gaji', 'Bonus',
      'Hadiah', 'Investasi', 'Lainnya',
    ]
    const requested = typeof parsed.category === 'string' ? parsed.category.trim() : ''
    const category = VALID_CATEGORIES.find(c => c.toLowerCase() === requested.toLowerCase()) ?? 'Lainnya'

    const type = VALID_TYPES.includes(parsed.type) ? parsed.type : 'expense'

    return NextResponse.json({
      type,
      amount,
      description: typeof parsed.description === 'string' ? parsed.description.substring(0, 200) : '',
      category,
      confidence: Number(parsed.confidence) || 0,
    })
  } catch (err) {
    console.error('[parse-voice]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
