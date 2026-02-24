import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import type { HabitItem } from '../types'

export async function fetchUserHabitItems(user: User): Promise<HabitItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('app_habit_items')
    .select('payload')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as { payload: HabitItem }[]
  return rows.map((row) => row.payload)
}

export async function upsertUserHabitItem(user: User, item: HabitItem): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.from('app_habit_items').upsert({
    id: item.id,
    user_id: user.id,
    title: item.title,
    type: item.type,
    payload: item,
  })

  if (error) {
    throw error
  }
}

export async function deleteUserHabitItem(user: User, itemId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase
    .from('app_habit_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}
