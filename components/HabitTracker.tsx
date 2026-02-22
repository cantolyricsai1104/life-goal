import React from 'react';
import { Check } from './Icons';
import { Habit } from '../types';

interface HabitTrackerProps {
  habit: Habit;
  onToggle: (habitId: string) => void;
  onStartTimer: (habit: Habit) => void;
  onUpdateSettings: (habitId: string, updates: Partial<Habit>) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ habit, onToggle, onStartTimer, onUpdateSettings }) => {
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.completedDates.includes(today);

  const handleEditSettings = (e: React.MouseEvent) => {
    e.stopPropagation();

    const durationInput = window.prompt(
      'How many minutes per day for this habit?',
      (habit.recommendedDuration ?? 20).toString()
    );
    if (durationInput === null) return;
    const duration = parseInt(durationInput, 10);

    const targetDaysInput = window.prompt(
      'For how many days do you want to keep this habit?',
      habit.targetDays ? habit.targetDays.toString() : '30'
    );

    const updates: Partial<Habit> = {};
    if (!Number.isNaN(duration)) {
      updates.recommendedDuration = duration;
    }

    if (targetDaysInput !== null) {
      const targetDays = parseInt(targetDaysInput, 10);
      if (!Number.isNaN(targetDays)) {
        updates.targetDays = targetDays;
      }
    }

    if (Object.keys(updates).length > 0) {
      onUpdateSettings(habit.id, updates);
    }
  };

  return (
    <div 
      className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
        isCompletedToday 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-white border-slate-100 hover:border-slate-300'
      }`}
      onClick={() => onToggle(habit.id)}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`
          flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
          ${isCompletedToday ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'}
        `}>
          {isCompletedToday && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
        <div className="min-w-0">
          <p className={`font-medium text-sm truncate ${isCompletedToday ? 'text-emerald-900 line-through opacity-75' : 'text-slate-700'}`}>
            {habit.title}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400 whitespace-nowrap">
              {habit.streak} day streak
            </p>
            {habit.recommendedDuration && (
              <button
                type="button"
                onClick={handleEditSettings}
                className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-medium hover:bg-slate-200"
              >
                {habit.recommendedDuration}m goal
              </button>
            )}
            {habit.targetDays && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-medium whitespace-nowrap">
                {habit.targetDays}-day plan
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {habit.recommendedDuration && !isCompletedToday && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onStartTimer(habit);
            }}
            className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 px-2 py-1 rounded-lg transition-colors border border-violet-100"
          >
            <span className="text-xs font-bold">Start</span>
          </button>
        )}
        
        {isCompletedToday && (
          <span className="text-xs font-bold text-emerald-600 animate-pulse whitespace-nowrap">
            Done!
          </span>
        )}
      </div>
    </div>
  );
};
