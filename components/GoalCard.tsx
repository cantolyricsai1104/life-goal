import React, { useState, useMemo } from 'react';
import { Goal, ASPECT_TEXT_COLORS, ASPECT_COLORS, Habit } from '../types';
import { AspectIcon, ChevronRight, Trash2, Sparkles, Check } from './Icons';
import { HabitTracker } from './HabitTracker';
import { getAdviceForGoal } from '../services/geminiService';
import { ActivityCalendar } from './ActivityCalendar';

interface GoalCardProps {
  goal: Goal;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onStartTimer: (habit: Habit) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdateGoal, onDeleteGoal, onStartTimer }) => {
  const [expanded, setExpanded] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);

  // Collect all unique completed dates across all habits for the goal-wide calendar
  const allCompletedDates = useMemo(() => {
    const dates = new Set<string>();
    goal.habits.forEach(h => {
      h.completedDates.forEach(d => dates.add(d));
    });
    return Array.from(dates);
  }, [goal.habits]);

  const handleToggleHabit = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    const updatedHabits = goal.habits.map(h => {
      if (h.id === habitId) {
        const isCompleted = h.completedDates.includes(today);
        let newDates = [...h.completedDates];
        let newStreak = h.streak;

        if (isCompleted) {
          newDates = newDates.filter(d => d !== today);
          newStreak = Math.max(0, newStreak - 1);
        } else {
          newDates.push(today);
          newStreak += 1;
        }

        return { ...h, completedDates: newDates, streak: newStreak };
      }
      return h;
    });

    onUpdateGoal({ ...goal, habits: updatedHabits });
  };

  const handleToggleMilestone = (milestoneId: string) => {
    const updatedMilestones = goal.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    
    // Recalculate progress
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

    onUpdateGoal({ ...goal, milestones: updatedMilestones, progress: newProgress });
  };

  const handleGetAdvice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdviceLoading(true);
    try {
      const advice = await getAdviceForGoal(goal.title, goal.progress);
      onUpdateGoal({ ...goal, aiAdvice: advice });
    } catch (err) {
      console.error(err);
    } finally {
      setAdviceLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${ASPECT_COLORS[goal.aspect]} bg-opacity-10`}>
              <AspectIcon aspect={goal.aspect} className={ASPECT_TEXT_COLORS[goal.aspect]} />
            </div>
            <div>
              <span className={`text-xs font-bold uppercase tracking-wide ${ASPECT_TEXT_COLORS[goal.aspect]}`}>
                {goal.aspect}
              </span>
              <h3 className="font-bold text-slate-800 leading-tight">{goal.title}</h3>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal.id); }}
            className="text-slate-300 hover:text-red-400 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{goal.description}</p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
          <div 
            className={`h-2.5 rounded-full transition-all duration-1000 ${ASPECT_COLORS[goal.aspect]}`} 
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>{goal.progress}% Achieved</span>
          <div className="flex items-center gap-1 group">
             {expanded ? 'Show Less' : 'Show Details'} <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="bg-slate-50 border-t border-slate-100 p-5 space-y-6 animate-fadeIn">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Habits Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daily Habits</h4>
              <div className="grid gap-2">
                {goal.habits.map(habit => (
                  <HabitTracker 
                    key={habit.id} 
                    habit={habit} 
                    onToggle={handleToggleHabit} 
                    onStartTimer={onStartTimer}
                  />
                ))}
              </div>
            </div>

            {/* Achievement Calendar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
               <ActivityCalendar 
                 completedDates={allCompletedDates} 
                 colorClass={ASPECT_COLORS[goal.aspect]} 
               />
            </div>
          </div>

          {/* Milestones Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Milestones</h4>
            <div className="space-y-2">
              {goal.milestones.map(milestone => (
                <div 
                  key={milestone.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${milestone.completed ? 'bg-slate-100 border-transparent opacity-60' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'}`}
                  onClick={() => !milestone.completed && handleToggleMilestone(milestone.id)}
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleToggleMilestone(milestone.id); }}
                    className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${milestone.completed ? 'bg-slate-400 border-slate-400' : 'border-slate-300'}`}
                  >
                    {milestone.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${milestone.completed ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Advice Section */}
          <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 relative shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <h4 className="text-sm font-bold text-violet-900">AI Architect Guidance</h4>
            </div>
            <p className="text-sm text-violet-800 italic leading-relaxed">
              "{goal.aiAdvice || "Focus on building a small streak first. Consistency is your greatest ally."}"
            </p>
            <button 
              onClick={handleGetAdvice}
              disabled={adviceLoading}
              className="mt-3 text-[10px] font-bold uppercase tracking-wider text-violet-600 hover:text-violet-800 flex items-center gap-1 bg-white/50 px-2 py-1 rounded border border-violet-100"
            >
              {adviceLoading ? 'Consulting Gemini...' : 'Get Fresh Advice'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
};