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

export type ScheduleTasksSnapshot = {
  tasks: Habit[]
  latestUpdatedAt: number | null
}

export async function fetchUserScheduleTasks(user: User): Promise<ScheduleTasksSnapshot> {
  if (!isSupabaseConfigured || !supabase) {
    return { tasks: [], latestUpdatedAt: null }
  }

  const { data, error } = await supabase
    .from('app_schedule_tasks')
    .select('payload, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as { payload: Habit; updated_at: string | null }[]
  const tasks = rows.map((row) => row.payload)
  const latestUpdatedAt = rows.reduce<number | null>((acc, row) => {
    if (!row.updated_at) return acc
    const value = Date.parse(row.updated_at)
    if (Number.isNaN(value)) return acc
    return acc === null ? value : Math.max(acc, value)
  }, null)
  return { tasks, latestUpdatedAt }
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

