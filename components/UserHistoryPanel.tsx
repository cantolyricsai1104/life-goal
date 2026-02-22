import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchRecords, AppRecord } from '../services/recordsService'

export const UserHistoryPanel: React.FC = () => {
  const { user } = useAuth()
  const [records, setRecords] = useState<AppRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setRecords([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchRecords(user)
        setRecords(data)
      } catch (e) {
        setError('Unable to load your history')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  if (!user) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-500">
        Log in to see your saved history.
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
      <div className="text-sm font-bold text-slate-700">Your history</div>
      {loading && (
        <div className="text-xs text-slate-500">Loading history…</div>
      )}
      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
      {!loading && !error && records.length === 0 && (
        <div className="text-xs text-slate-400">No history yet.</div>
      )}
      <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
        {records.map((record) => (
          <li
            key={record.id}
            className="flex items-center justify-between px-2 py-1 rounded-lg border border-slate-100"
          >
            <span className="font-mono text-[10px] uppercase text-slate-500">
              {record.type}
            </span>
            <span className="text-slate-600 truncate max-w-[200px]">
              {typeof record.data === 'string' ? record.data : JSON.stringify(record.data)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

