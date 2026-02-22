import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabaseClient'

type TimerMemoRow = {
  id: string
  user_id: string
  habit_id: string
  payload: unknown
  created_at: string
  updated_at: string
}

export async function fetchUserTimerMemos(user: User, habitId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('app_timer_memos')
    .select('payload')
    .eq('user_id', user.id)
    .eq('habit_id', habitId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as { payload: unknown }[]
  return rows.map((row) => row.payload)
}

export async function upsertUserTimerMemo(user: User, habitId: string, memoId: string, payload: unknown) {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.from('app_timer_memos').upsert({
    id: memoId,
    user_id: user.id,
    habit_id: habitId,
    payload,
  })

  if (error) {
    throw error
  }
}

export async function deleteUserTimerMemo(user: User, habitId: string, memoId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase
    .from('app_timer_memos')
    .delete()
    .eq('id', memoId)
    .eq('user_id', user.id)
    .eq('habit_id', habitId)

  if (error) {
    throw error
  }
}

