import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// Format number as Indonesian Rupiah for Excel (no symbol, just formatted number)
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// Escape CSV cell — wrap in quotes, escape internal quotes
function cell(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  let query = supabase
    .from('transactions')
    .select(`
      transaction_date,
      type,
      amount,
      description,
      note,
      category:categories ( name, icon ),
      account:accounts ( name, type )
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('transaction_date', dateFrom)
  if (dateTo) query = query.lte('transaction_date', dateTo)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []

  type JoinShape = { name: string; icon?: string; type?: string } | null

  // Calculate summary
  const totalIncome = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const net = totalIncome - totalExpense

  const exportDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // ── Build CSV lines ──────────────────────────────────────────────────────────

  const lines: string[] = []

  // Title & metadata
  lines.push('LAPORAN TRANSAKSI UANGKU')
  lines.push(`Diekspor pada,${exportDate}`)
  if (dateFrom || dateTo) {
    lines.push(`Periode,${dateFrom ? formatDate(dateFrom) : 'Awal'} - ${dateTo ? formatDate(dateTo) : 'Sekarang'}`)
  }
  lines.push(`Total Transaksi,${rows.length} transaksi`)
  lines.push('')

  // Summary
  lines.push('RINGKASAN')
  lines.push(`Total Pemasukan,Rp ${formatRupiah(totalIncome)}`)
  lines.push(`Total Pengeluaran,Rp ${formatRupiah(totalExpense)}`)
  lines.push(`Selisih,Rp ${net >= 0 ? '' : '-'}${formatRupiah(Math.abs(net))}`)
  lines.push('')

  // Header row
  lines.push([
    'No',
    'Tanggal',
    'Jenis',
    'Kategori',
    'Rekening',
    'Keterangan',
    'Nominal (Rp)',
    'Catatan',
  ].map(cell).join(','))

  // Data rows
  rows.forEach((row, i) => {
    const categoryName = (row.category as unknown as JoinShape)?.name ?? '-'
    const accountName = (row.account as unknown as JoinShape)?.name ?? '-'
    const type = row.type === 'income' ? 'Pemasukan' : 'Pengeluaran'
    const amount = row.type === 'income'
      ? formatRupiah(row.amount)
      : `-${formatRupiah(row.amount)}`

    lines.push([
      i + 1,
      formatDate(row.transaction_date),
      type,
      categoryName,
      accountName,
      row.description ?? '',
      amount,
      row.note ?? '',
    ].map(cell).join(','))
  })

  lines.push('')
  lines.push('---')
  lines.push('Dibuat oleh Uangku - Aplikasi Keuangan Pribadi')
  lines.push(`uangkuh.vercel.app`)

  // BOM (Byte Order Mark) for Excel to correctly read UTF-8
  const BOM = '\uFEFF'
  const csv = BOM + lines.join('\r\n')

  const periodSuffix = dateFrom && dateTo
    ? `-${dateFrom}-sd-${dateTo}`
    : `-${new Date().toISOString().split('T')[0]}`
  const filename = `Laporan-Transaksi-Uangku${periodSuffix}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
