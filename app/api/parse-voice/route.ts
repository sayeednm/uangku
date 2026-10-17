import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkAiRateLimit } from '@/lib/utils/rateLimit'

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
    // Low latency profile: deterministic output with a hard token cap — the
    // answer is tiny JSON, so capping output shortens generation noticeably.
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { temperature: 0, maxOutputTokens: 256 },
    })

    // Compact prompt — every token on both sides costs latency. Also brief
    // retry for transient upstream failures (503 overload / 429 rate limit).
    const prompt = `Ubah kalimat lisan berikut (bahasa Indonesia santai) menjadi data transaksi. Jawab HANYA JSON, tanpa teks lain:
{"type":"expense"|"income","amount":<integer>,"description":"<maks 50 karakter>","category":"<dari list bawah>","confidence":<0..1>}

Aturan angka lisan: "20 ribu"=20000, "2 juta"=2000000, "dua belas setengah ribu"=12500, "7 k"=7000.
type=income untuk uang masuk (gaji, bonus, hadiah); expense untuk belanja/uang keluar.
Kategori pengeluaran valid: Makanan, Transportasi, Belanja, Tagihan, Rumah, Kesehatan, Hiburan, Pendidikan, Pakaian, Keluarga, Lainnya.
Kategori pemasukan valid: Gaji, Bonus, Hadiah, Investasi, Lainnya.
Jika tidak ada nominal: {"error":"Tidak ada nominal yang terdeteksi"}

Kalimat: "${text}"`

    let result
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        result = await model.generateContent(prompt)
        break
      } catch (aiErr) {
        const status = (aiErr as { status?: number })?.status
        const transient = status === 503 || status === 429 || status === 500
        console.error(`[parse-voice] attempt ${attempt}/2 failed:`, status ?? aiErr)
        if (!transient || attempt === 2) throw aiErr
        await new Promise(r => setTimeout(r, 1200))
      }
    }
    const responseText = result!.response.text().trim()

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
