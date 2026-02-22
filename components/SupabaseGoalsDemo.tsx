import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

type SimpleGoal = {
  id: string
  title: string
  completed: boolean
  created_at: string
}

export const SupabaseGoalsDemo: React.FC = () => {
  const [goals, setGoals] = useState<SimpleGoal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    const loadGoals = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('goals')
          .select('id, title, completed, created_at')
          .order('created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setGoals(data ?? [])
        }
      } catch (err) {
        setError('Unable to load goals from Supabase')
      } finally {
        setLoading(false)
      }
    }

    loadGoals()
  }, [])

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newTitle.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({ title: newTitle.trim(), completed: false })
        .select()

      if (error) {
        setError(error.message)
      } else if (data && data.length > 0) {
        setGoals((prev) => [data[0] as SimpleGoal, ...prev])
        setNewTitle('')
      }
    } catch (err) {
      setError('Unable to add goal to Supabase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-700">Supabase Goals Demo</h3>
        <p className="text-xs text-slate-500">
          This section reads and writes simple goals to the Supabase
          <span className="font-mono"> goals</span> table.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          placeholder="New Supabase goal title"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {loading && (
        <p className="text-xs text-slate-500">Talking to Supabase…</p>
      )}

      {error && (
        <p className="text-xs text-red-600">
          Supabase error:
          {' '}
          {error}
        </p>
      )}

      <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
        {goals.length === 0 && !loading && !error && (
          <li className="text-slate-400">No Supabase goals yet.</li>
        )}
        {goals.map((goal) => (
          <li
            key={goal.id}
            className="flex items-center justify-between px-2 py-1 rounded-lg border border-slate-100"
          >
            <span className="truncate">{goal.title}</span>
            {goal.completed && (
              <span className="text-[10px] text-emerald-600 font-semibold">
                Done
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

