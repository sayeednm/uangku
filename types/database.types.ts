// Database types generated from Supabase schema
// This file should be regenerated after schema changes using:
// npx supabase gen types typescript --local > types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'other'
export type CategoryType = 'income' | 'expense'
export type TransactionType = 'income' | 'expense'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: AccountType
          initial_balance: number
          icon: string | null
          color: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: AccountType
          initial_balance?: number
          icon?: string | null
          color?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: AccountType
          initial_balance?: number
          icon?: string | null
          color?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: CategoryType
          icon: string | null
          color: string | null
          is_archived: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: CategoryType
          icon?: string | null
          color?: string | null
          is_archived?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: CategoryType
          icon?: string | null
          color?: string | null
          is_archived?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string
          type: TransactionType
          amount: number
          description: string | null
          recipient: string | null
          note: string | null
          transaction_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id: string
          type: TransactionType
          amount: number
          description?: string | null
          recipient?: string | null
          note?: string | null
          transaction_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string
          type?: TransactionType
          amount?: number
          description?: string | null
          recipient?: string | null
          note?: string | null
          transaction_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      transfers: {
        Row: {
          id: string
          user_id: string
          from_account_id: string
          to_account_id: string
          amount: number
          description: string | null
          transaction_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          from_account_id: string
          to_account_id: string
          amount: number
          description?: string | null
          transaction_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          from_account_id?: string
          to_account_id?: string
          amount?: number
          description?: string | null
          transaction_date?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: AccountType
      category_type: CategoryType
      transaction_type: TransactionType
    }
  }
}
