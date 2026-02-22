import React from 'react';
import { AuthPanel } from './AuthPanel';
import { Calendar } from './Icons';

const LandingPage: React.FC = () => {
  const handleScrollToAuth = () => {
    const el = document.getElementById('auth-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-200">
              L
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              LifeArchitect
            </span>
          </div>
          <button
            type="button"
            onClick={handleScrollToAuth}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
          >
            Sign up / Sign in
          </button>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center">
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Design the life you want, one habit at a time.
            </h1>
            <p className="text-slate-600 text-base sm:text-lg">
              LifeArchitect helps you turn big dreams into daily actions across
              health, relationships, finances, learning, and more.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleScrollToAuth}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm sm:text-base font-semibold shadow-md shadow-violet-200 hover:bg-violet-700"
              >
                Sign up / Sign in to get started
              </button>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                <Calendar className="w-4 h-4 text-violet-600" />
                <span>Track goals, habits, and progress in one place.</span>
              </div>
            </div>
          </div>

          <div
            id="auth-panel"
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
          >
            <AuthPanel />
          </div>
        </div>
      </main>
    </div>
  );
};

export { LandingPage };

