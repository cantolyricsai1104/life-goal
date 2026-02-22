import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import type { Habit } from '../types'

type ScheduleTaskRow = {
  id: string
  user_id: string
  payload: Habit
  created_at: string
  updated_at: string
}

export async function fetchUserScheduleTasks(user: User): Promise<Habit[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('app_schedule_tasks')
    .select('payload')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as { payload: Habit }[]
  return rows.map((row) => row.payload)
}

export async function upsertUserScheduleTask(user: User, task: Habit): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.from('app_schedule_tasks').upsert({
    id: task.id,
    user_id: user.id,
    payload: task,
  })

  if (error) {
    throw error
  }
}

export async function deleteUserScheduleTask(user: User, taskId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase
    .from('app_schedule_tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

