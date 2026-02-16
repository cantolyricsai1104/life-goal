import React from 'react';
import { Check } from './Icons';
import { Habit } from '../types';
import { HabitTimer } from './HabitTimer';

interface HabitTrackerProps {
  habit: Habit;
  onToggle: (habitId: string) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ habit, onToggle }) => {
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.completedDates.includes(today);

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
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                {habit.recommendedDuration}m goal
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {habit.recommendedDuration && !isCompletedToday && (
          <HabitTimer 
            durationMinutes={habit.recommendedDuration} 
            onComplete={() => onToggle(habit.id)} 
            disabled={isCompletedToday}
          />
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