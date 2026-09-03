/**
 * Transaksi (Transaction) queries.
 * All queries use the server Supabase client — RLS enforced.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type TransactionRow = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionType = 'income' | 'expense'

export interface TransactionWithRefs extends TransactionRow {
  category: { id: string; name: string; icon: string | null; color: string | null; type: string }
  account: { id: string; name: string; type: string }
}

export interface TransactionFilters {
  type?: TransactionType
  account_id?: string
  category_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getTransactions(
  filters: TransactionFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<TransactionWithRefs>> {
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories ( id, name, icon, color, type ),
      account:accounts ( id, name, type )
    `, { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.account_id) query = query.eq('account_id', filters.account_id)
  if (filters.category_id) query = query.eq('category_id', filters.category_id)
  if (filters.date_from) query = query.gte('transaction_date', filters.date_from)
  if (filters.date_to) query = query.lte('transaction_date', filters.date_to)
  if (filters.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,note.ilike.%${filters.search}%`
    )
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  return {
    data: (data ?? []) as unknown as TransactionWithRefs[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

export async function getTransactionById(id: string): Promise<TransactionWithRefs | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories ( id, name, icon, color, type ),
      account:accounts ( id, name, type )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as unknown as TransactionWithRefs
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface CreateTransactionInput {
  type: TransactionType
  amount: number
  account_id: string
  category_id: string
  transaction_date: string
  description?: string
  note?: string
}

export async function createTransaction(input: CreateTransactionInput): Promise<TransactionRow> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: input.type,
      amount: input.amount,
      account_id: input.account_id,
      category_id: input.category_id,
      transaction_date: input.transaction_date,
      description: input.description?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export interface UpdateTransactionInput {
  type?: TransactionType
  amount?: number
  account_id?: string
  category_id?: string
  transaction_date?: string
  description?: string | null
  note?: string | null
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionRow> {
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (input.type !== undefined) update.type = input.type
  if (input.amount !== undefined) update.amount = input.amount
  if (input.account_id !== undefined) update.account_id = input.account_id
  if (input.category_id !== undefined) update.category_id = input.category_id
  if (input.transaction_date !== undefined) update.transaction_date = input.transaction_date
  if (input.description !== undefined) update.description = input.description?.trim() || null
  if (input.note !== undefined) update.note = input.note?.trim() || null

  const { data, error } = await supabase
    .from('transactions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw error
}
