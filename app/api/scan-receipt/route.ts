import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Foto terlalu besar (max 10MB)' }, { status: 400 })
    }

    console.log('[scan-receipt] file:', file.name, file.size, file.type)

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // Call Gemini Vision
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ])

    const responseText = result.response.text().trim()
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

    return NextResponse.json({
      amount: parsed.amount ?? 0,
      description: parsed.description ?? '',
      date: parsed.date ?? null,
      category: parsed.category ?? 'Lainnya',
      confidence: parsed.confidence ?? 0,
    })
  } catch (err) {
    console.error('[scan-receipt]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
