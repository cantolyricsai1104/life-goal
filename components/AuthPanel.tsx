import React, { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const AuthPanel: React.FC = () => {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { error: signupError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signupError) {
          setError(signupError.message)
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (loginError) {
          setError(loginError.message)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (user) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Signed in as</div>
          <div className="text-sm font-medium text-slate-800">{user.email}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700">
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-xs text-violet-600"
        >
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          placeholder="Email"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <div className="text-xs text-red-600">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? 'Working…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
    </div>
  )
}

