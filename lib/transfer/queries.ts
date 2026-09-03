/**
 * Transfer queries — server client, RLS enforced.
 * Transfers are NOT counted as income or expense.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type TransferRow = Database['public']['Tables']['transfers']['Row']

export interface TransferWithAccounts extends TransferRow {
  from_account: { id: string; name: string; type: string }
  to_account: { id: string; name: string; type: string }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getTransfers(
  page = 1,
  pageSize = 20,
): Promise<{ data: TransferWithAccounts[]; total: number; page: number; pageSize: number }> {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('transfers')
    .select(`
      *,
      from_account:accounts!transfers_from_account_id_fkey ( id, name, type ),
      to_account:accounts!transfers_to_account_id_fkey ( id, name, type )
    `, { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    data: (data ?? []) as unknown as TransferWithAccounts[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

export async function getTransferById(id: string): Promise<TransferWithAccounts | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transfers')
    .select(`
      *,
      from_account:accounts!transfers_from_account_id_fkey ( id, name, type ),
      to_account:accounts!transfers_to_account_id_fkey ( id, name, type )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as unknown as TransferWithAccounts
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface CreateTransferInput {
  from_account_id: string
  to_account_id: string
  amount: number
  transaction_date: string
  description?: string
}

export async function createTransfer(input: CreateTransferInput): Promise<TransferRow> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  if (input.from_account_id === input.to_account_id)
    throw new Error('Rekening asal dan tujuan tidak boleh sama')
  if (input.amount <= 0)
    throw new Error('Nominal harus lebih dari 0')

  const { data, error } = await supabase
    .from('transfers')
    .insert({
      user_id: user.id,
      from_account_id: input.from_account_id,
      to_account_id: input.to_account_id,
      amount: input.amount,
      transaction_date: input.transaction_date,
      description: input.description?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTransfer(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('transfers').delete().eq('id', id)
  if (error) throw error
}
