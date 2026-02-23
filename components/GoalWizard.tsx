import React, { useState } from 'react';
import { Sparkles, Plus } from './Icons';
import { generateGoalPlan, AIPlanResponse } from '../services/geminiService';
import { LifeAspect, Goal, Habit, Milestone } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface GoalWizardProps {
  onAddGoal: (goal: Goal) => void;
  onClose: () => void;
}

export const GoalWizard: React.FC<GoalWizardProps> = ({ onAddGoal, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIPlanResponse | null>(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await generateGoalPlan(input);
      setPlan(result);
    } catch (e) {
      console.error("Failed to generate plan", e);
      alert("AI is taking a nap. Try again momentarily.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!plan) return;

    const newGoal: Goal = {
      id: uuidv4(),
      title: plan.title,
      description: plan.description,
      aspect: plan.aspect as LifeAspect,
      progress: 0,
      milestones: plan.milestones.map(m => ({ id: uuidv4(), title: m, completed: false })),
      habits: plan.habits.map((h, index) => ({ 
        id: uuidv4(), 
        title: h.title, 
        frequency: 'daily', 
        completedDates: [], 
        streak: 0,
        recommendedDuration: h.duration ?? 20,
        timeOfDay: index === 0 ? '07:00' : index === 1 ? '20:00' : '12:00',
        targetDays: 30,
      })),
      aiAdvice: plan.motivationalQuote,
      createdAt: Date.now()
    };

    onAddGoal(newGoal);
    onClose();
  };

  const handleBack = () => {
    setPlan(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-xl font-bold">AI Goal Architect</h2>
          </div>
          <p className="text-indigo-100 text-sm">Tell me a vague dream, and I'll build a concrete plan.</p>
        </div>

        <div className="p-6 overflow-y-auto">
          {!plan ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">What do you want to achieve?</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., I want to run a marathon, or I want to learn Spanish..."
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none h-32"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !input.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Designing Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Smart Plan
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 ${plan.aspect === 'Health' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {plan.aspect}
                </span>
                <h3 className="text-2xl font-bold text-slate-900">{plan.title}</h3>
                <p className="text-slate-600 mt-2 italic">"{plan.description}"</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Key Milestones
                </h4>
                <ul className="space-y-2">
                  {plan.milestones.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-slate-400 mt-0.5">•</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Daily Habits
                </h4>
                <ul className="space-y-2">
                  {plan.habits.map((h, i) => (
                    <li key={i} className="flex items-center justify-between text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 mt-0.5">↻</span>
                        {h.title}
                      </div>
                      {h.duration && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                          {h.duration} min
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm italic text-center">
                "{plan.motivationalQuote}"
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={!plan}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium disabled:text-slate-300"
            >
              Back
            </button>
            <button
              onClick={plan ? handleConfirm : handleGenerate}
              disabled={loading || (!plan && !input.trim())}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-medium shadow-md shadow-violet-200 transition-all flex items-center gap-2"
            >
              {plan ? (
                <>
                  <Plus className="w-4 h-4" />
                  Next
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Next
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
