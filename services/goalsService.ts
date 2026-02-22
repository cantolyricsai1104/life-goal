import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import type { Goal } from '../types'

type GoalRow = {
  id: string
  user_id: string
  title: string
  aspect: string | null
  progress: number
  payload: Goal
  created_at: string
  updated_at: string
}

export async function fetchUserGoals(user: User): Promise<Goal[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('app_goals')
    .select('payload')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as { payload: Goal }[]
  return rows.map((row) => row.payload)
}

export async function upsertUserGoal(user: User, goal: Goal): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.from('app_goals').upsert({
    id: goal.id,
    user_id: user.id,
    title: goal.title,
    aspect: goal.aspect,
    progress: goal.progress,
    payload: goal,
  })

  if (error) {
    throw error
  }
}

export async function deleteUserGoal(user: User, goalId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase
    .from('app_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

