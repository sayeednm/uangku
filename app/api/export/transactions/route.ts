import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Query params for filtering
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  // Fetch transactions with category and account
  let query = supabase
    .from('transactions')
    .select(`
      transaction_date,
      type,
      amount,
      description,
      note,
      category:categories ( name ),
      account:accounts ( name )
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('transaction_date', dateFrom)
  if (dateTo) query = query.lte('transaction_date', dateTo)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build CSV
  const rows = data ?? []
  const headers = ['Tanggal', 'Jenis', 'Nominal', 'Kategori', 'Rekening', 'Keterangan', 'Catatan']

  const csvLines = [
    headers.join(','),
    ...rows.map(row => {
      type JoinShape = { name: string } | null
      const categoryName = (row.category as unknown as JoinShape)?.name ?? '-'
      const accountName = (row.account as unknown as JoinShape)?.name ?? '-'
      const type = row.type === 'income' ? 'Pemasukan' : 'Pengeluaran'
      const amount = row.amount.toString()
      const desc = `"${(row.description ?? '').replace(/"/g, '""')}"`
      const note = `"${(row.note ?? '').replace(/"/g, '""')}"`
      return [row.transaction_date, type, amount, categoryName, accountName, desc, note].join(',')
    }),
  ]

  const csv = csvLines.join('\n')
  const filename = `uangku-transaksi-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
