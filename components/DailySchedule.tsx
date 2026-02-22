import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Goal, Habit, LifeAspect, ASPECT_COLORS, ASPECT_TEXT_COLORS } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, MoreHorizontal } from './Icons';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';

interface DailyScheduleProps {
  goals: Goal[];
  onToggleHabit: (habitId: string) => void;
}

export const DailySchedule: React.FC<DailyScheduleProps> = ({ goals, onToggleHabit }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate days for the week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  // Get all habits for the selected day
  const dailyHabits = useMemo(() => {
    const habits: { habit: Habit; goalColor: string; goalAspect: LifeAspect }[] = [];
    
    goals.forEach(goal => {
      goal.habits.forEach(habit => {
        // For now, assume all habits are daily or check frequency
        // In a real app, we'd check habit.frequency === 'daily' or specific days
        if (habit.frequency === 'daily' || habit.frequency === 'weekly') {
          habits.push({
            habit,
            goalColor: ASPECT_COLORS[goal.aspect],
            goalAspect: goal.aspect
          });
        }
      });
    });

    // Sort by time
    return habits.sort((a, b) => {
      const timeA = a.habit.timeOfDay || '00:00';
      const timeB = b.habit.timeOfDay || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [goals, selectedDate]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = new Date().getHours();
      // Scroll to 1 hour before current time to give context
      const scrollPosition = Math.max(0, (currentHour - 1) * 60); 
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  const hours = Array.from({ length: 24 }).map((_, i) => i);

  const getHabitPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes; // Position in pixels (1min = 1px height for simplicity, or scale it)
  };

  // Group habits by hour to avoid overlap or just list them
  // For the timeline view, we want to place them at specific vertical positions
  
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {/* Header: Month and Year */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-1 hover:bg-slate-100 rounded-full">
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">
            {format(selectedDate, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-1 hover:bg-slate-100 rounded-full">
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setSelectedDate(new Date())}
                className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
            >
                Today
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-full">
                <CalendarIcon className="w-5 h-5 text-slate-500" />
            </button>
        </div>
      </div>

      {/* Week Days Row */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {weekDays.map((date, i) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          
          return (
            <div 
              key={i} 
              onClick={() => setSelectedDate(date)}
              className={`
                flex flex-col items-center justify-center py-3 cursor-pointer transition-colors
                ${isSelected ? 'bg-white shadow-sm' : 'hover:bg-slate-50'}
              `}
            >
              <span className={`text-xs font-medium mb-1 ${isToday ? 'text-violet-600' : 'text-slate-400'}`}>
                {format(date, 'EEE')}
              </span>
              <div className={`
                w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
                ${isSelected ? 'bg-slate-900 text-white' : isToday ? 'text-violet-600 bg-violet-50' : 'text-slate-700'}
              `}>
                {format(date, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline Scroll Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative scroll-smooth"
      >
        {/* Current Time Indicator Line (only if today) */}
        {isSameDay(selectedDate, new Date()) && (
            <div 
                className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none flex items-center"
                style={{ top: `${(new Date().getHours() * 60) + new Date().getMinutes()}px` }}
            >
                <div className="w-2 h-2 bg-red-400 rounded-full -ml-1"></div>
            </div>
        )}

        {/* Hours Grid */}
        <div className="relative min-h-[1440px]"> {/* 24h * 60px/h = 1440px */}
          {hours.map(hour => (
            <div key={hour} className="absolute w-full flex" style={{ top: `${hour * 60}px`, height: '60px' }}>
              {/* Time Label */}
              <div className="w-16 flex-shrink-0 text-xs text-slate-400 text-right pr-3 -mt-2.5 bg-white z-10">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {/* Horizontal Line */}
              <div className="flex-1 border-t border-slate-100"></div>
            </div>
          ))}

          {/* Events */}
          {dailyHabits.map(({ habit, goalColor, goalAspect }, index) => {
            // Default to 8 AM if no time set, or skip? Let's default to 8 AM for demo purposes if missing
            // But ideally we only show ones with time.
            // If no time, maybe put them in "All Day" section?
            // For this implementation, let's assume we want to show them on the timeline.
            // If timeOfDay is missing, we'll skip or put at top.
            // Let's put them at 00:00 if missing for now, or maybe random times for the mock data.
            
            if (!habit.timeOfDay) return null;

            const [h, m] = habit.timeOfDay.split(':').map(Number);
            const top = (h * 60) + m;
            const duration = habit.recommendedDuration || 60; // Default 60 mins height
            const height = Math.max(duration, 30); // Min height 30px

            const isCompleted = habit.completedDates.includes(format(selectedDate, 'yyyy-MM-dd'));

            return (
              <div
                key={habit.id}
                className={`
                  absolute left-16 right-4 rounded-lg p-2 border-l-4 text-xs cursor-pointer transition-all hover:brightness-95
                  ${goalColor.replace('bg-', 'bg-opacity-10 bg-')} 
                  ${goalColor.replace('bg-', 'border-')}
                `}
                style={{ 
                  top: `${top}px`, 
                  height: `${height}px`,
                  zIndex: 10
                }}
                onClick={() => onToggleHabit(habit.id)}
              >
                <div className="flex justify-between items-start h-full">
                  <div className="flex flex-col h-full justify-between">
                    <span className={`font-semibold ${ASPECT_TEXT_COLORS[goalAspect]}`}>
                      {habit.title}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {habit.timeOfDay} - {format(new Date().setHours(h, m + duration), 'h:mm a')}
                    </span>
                  </div>
                  {isCompleted && (
                    <div className={`rounded-full p-1 ${goalColor} text-white`}>
                        <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
