import { supabase, isSupabaseConfigured } from './supabaseClient'
import type { User } from '@supabase/supabase-js'

export type AppRecord = {
  id: string
  user_id: string
  type: string
  data: unknown
  created_at: string
}

export async function saveRecord(user: User, type: string, data: unknown) {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.from('records').insert({
    user_id: user.id,
    type,
    data,
  })

  if (error) {
    throw error
  }
}

export async function fetchRecords(user: User): Promise<AppRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as AppRecord[]) ?? []
}
