import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Goal, Habit, LifeAspect, ASPECT_COLORS, ASPECT_TEXT_COLORS } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, MoreHorizontal, Timer as TimerIcon, Play, Pause } from './Icons';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';

interface DailyScheduleProps {
  goals: Goal[];
  scheduleTasks: Habit[];
  onToggleHabit: (habitId: string, dateStr?: string) => void;
  onUpdateHabitSchedule: (habitId: string, updates: Partial<Habit>) => void;
  onCreateHabit: (timeOfDay: string, duration: number, title: string, startDate?: string, endDate?: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onStartTimer: (habit: Habit) => void;
}

type InteractionMode = 'move' | 'resize-top' | 'resize-bottom';

interface InteractionState {
  habitId: string;
  mode: InteractionMode;
  startY: number;
  startMinutes: number;
  startDuration: number;
}

type ContextTarget = 'empty' | 'event';

interface ContextMenuState {
  target: ContextTarget;
  habitId?: string;
  minutes: number;
  x: number;
  y: number;
  name: string;
  startDate?: string;
  endDate?: string;
}

interface TimerMenuState {
  habit: Habit;
  x: number;
  y: number;
}

interface InlineTimerState {
  remaining: number;
  running: boolean;
}

const getHongKongMinutes = () => {
  const now = new Date();
  const timeString = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  const [h, m] = timeString.split(':').map(Number);
  return h * 60 + m;
};

const getHongKongLabel = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hong_Kong',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);
};

const formatSeconds = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const DailySchedule: React.FC<DailyScheduleProps> = ({
  goals,
  scheduleTasks,
  onToggleHabit,
  onUpdateHabitSchedule,
  onCreateHabit,
  onDeleteHabit,
  onStartTimer,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [tempEdits, setTempEdits] = useState<Record<string, { timeOfDay: string; duration: number }>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [timerMenu, setTimerMenu] = useState<TimerMenuState | null>(null);
  const [inlineTimers, setInlineTimers] = useState<Record<string, InlineTimerState>>({});
  const [currentHongKongTime, setCurrentHongKongTime] = useState(() => ({
    minutes: getHongKongMinutes(),
    label: getHongKongLabel(),
  }));
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isWithinRange = (dateStr: string, startDate?: string, endDate?: string) => {
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

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
        if (habit.frequency === 'daily' || habit.frequency === 'weekly') {
          habits.push({
            habit,
            goalColor: ASPECT_COLORS[goal.aspect],
            goalAspect: goal.aspect
          });
        }
      });
    });

    scheduleTasks.forEach(habit => {
      if (!isWithinRange(selectedDateStr, habit.startDate, habit.endDate)) {
        return;
      }
      habits.push({
        habit,
        goalColor: 'bg-slate-400',
        goalAspect: LifeAspect.HEALTH,
      });
    });

    return habits.sort((a, b) => {
      const timeA = a.habit.timeOfDay || '00:00';
      const timeB = b.habit.timeOfDay || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [goals, scheduleTasks, selectedDate]);

  useEffect(() => {
    const update = () => {
      setCurrentHongKongTime({
        minutes: getHongKongMinutes(),
        label: getHongKongLabel(),
      });
    };
    update();
    const id = window.setInterval(update, 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const minutes = getHongKongMinutes();
      const scrollPosition = Math.max(0, minutes - 60);
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  const hours = Array.from({ length: 24 }).map((_, i) => i);

  const getHabitPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number) => {
    const clamped = Math.max(0, Math.min(24 * 60, minutes));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const snapMinutes = (minutes: number) => {
    const snapped = Math.round(minutes / 15) * 15;
    return Math.max(0, Math.min(24 * 60, snapped));
  };

  const getHabitDisplay = (habit: Habit) => {
    const override = tempEdits[habit.id];
    const sourceTime = override?.timeOfDay ?? habit.timeOfDay ?? '00:00';
    const minutes = timeToMinutes(sourceTime);
    const duration = Math.max(override?.duration ?? habit.recommendedDuration ?? 60, 15);
    return { minutes, duration, timeOfDay: sourceTime };
  };

  const startInteraction = (
    habitId: string,
    mode: InteractionMode,
    clientY: number,
    startMinutes: number,
    duration: number
  ) => {
    setInteraction({
      habitId,
      mode,
      startY: clientY,
      startMinutes,
      startDuration: duration,
    });
    setTempEdits(prev => ({
      ...prev,
      [habitId]: {
        timeOfDay: minutesToTime(startMinutes),
        duration,
      },
    }));
  };

  useEffect(() => {
    if (!interaction) return;

    const handleMove = (event: MouseEvent) => {
      const deltaY = event.clientY - interaction.startY;
      const deltaMinutes = snapMinutes(interaction.startMinutes + deltaY) - interaction.startMinutes;
      processMove(deltaY, deltaMinutes);
    };

    const handleTouchMoveWindow = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault(); // Prevent scrolling while dragging
      const touch = event.touches[0];
      const deltaY = touch.clientY - interaction.startY;
      const deltaMinutes = snapMinutes(interaction.startMinutes + deltaY) - interaction.startMinutes;
      processMove(deltaY, deltaMinutes);
    };

    const processMove = (deltaY: number, deltaMinutes: number) => {
      if (!tempEdits[interaction.habitId]) {
        return;
      }

      if (interaction.mode === 'move') {
        const newStart = snapMinutes(interaction.startMinutes + deltaY);
        const maxStart = 24 * 60 - interaction.startDuration;
        const clampedStart = Math.max(0, Math.min(maxStart, newStart));
        setTempEdits(prev => ({
          ...prev,
          [interaction.habitId]: {
            timeOfDay: minutesToTime(clampedStart),
            duration: prev[interaction.habitId].duration,
          },
        }));
      } else if (interaction.mode === 'resize-bottom') {
        const newDuration = Math.max(15, interaction.startDuration + deltaMinutes);
        const maxDuration = 24 * 60 - interaction.startMinutes;
        const clampedDuration = Math.max(15, Math.min(maxDuration, snapMinutes(newDuration)));
        setTempEdits(prev => ({
          ...prev,
          [interaction.habitId]: {
            timeOfDay: prev[interaction.habitId].timeOfDay,
            duration: clampedDuration,
          },
        }));
      } else if (interaction.mode === 'resize-top') {
        const newStartRaw = interaction.startMinutes + deltaMinutes;
        const newStart = snapMinutes(newStartRaw);
        const maxStart = interaction.startMinutes + interaction.startDuration - 15;
        const clampedStart = Math.max(0, Math.min(maxStart, newStart));
        const newDuration = interaction.startMinutes + interaction.startDuration - clampedStart;
        setTempEdits(prev => ({
          ...prev,
          [interaction.habitId]: {
            timeOfDay: minutesToTime(clampedStart),
            duration: Math.max(15, snapMinutes(newDuration)),
          },
        }));
      }
    };

    const handleUp = () => {
      const current = tempEdits[interaction.habitId];
      if (current) {
        onUpdateHabitSchedule(interaction.habitId, {
          timeOfDay: current.timeOfDay,
          recommendedDuration: current.duration,
        });
        setTempEdits(prev => {
          const next = { ...prev };
          delete next[interaction.habitId];
          return next;
        });
      }
      setInteraction(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMoveWindow, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMoveWindow);
      window.removeEventListener('touchend', handleUp);
    };
  }, [interaction, onUpdateHabitSchedule, tempEdits]);

  const handleTimelineContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const minutes = snapMinutes(y);
    const maxStart = 24 * 60 - 60;
    const startMinutes = Math.max(0, Math.min(maxStart, minutes));
    setContextMenu({
      target: 'empty',
      minutes: startMinutes,
      x: event.clientX,
      y: event.clientY,
      name: 'New Task',
      startDate: selectedDateStr,
      endDate: selectedDateStr,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextNameChange = (value: string) => {
    if (!contextMenu) return;
    setContextMenu({ ...contextMenu, name: value });
  };

  const handleContextStartDateChange = (value: string) => {
    if (!contextMenu) return;
    setContextMenu({ ...contextMenu, startDate: value });
  };

  const handleContextEndDateChange = (value: string) => {
    if (!contextMenu) return;
    setContextMenu({ ...contextMenu, endDate: value });
  };

  const handleCreateFromContext = () => {
    if (!contextMenu || contextMenu.target !== 'empty') return;
    const timeOfDay = minutesToTime(contextMenu.minutes);
    const title = contextMenu.name.trim() || 'New Task';
    onCreateHabit(timeOfDay, 60, title, contextMenu.startDate, contextMenu.endDate);
    setContextMenu(null);
  };

  const handleDeleteFromContext = () => {
    if (!contextMenu || contextMenu.target !== 'event' || !contextMenu.habitId) return;
    onDeleteHabit(contextMenu.habitId);
    setContextMenu(null);
  };

  const handleRenameFromContext = () => {
    if (!contextMenu || contextMenu.target !== 'event' || !contextMenu.habitId) return;
    const title = contextMenu.name.trim();
    if (!title) return;
    onUpdateHabitSchedule(contextMenu.habitId, { title });
    setContextMenu(null);
  };

  const handleUpdateRangeFromContext = () => {
    if (!contextMenu || contextMenu.target !== 'event' || !contextMenu.habitId) return;
    onUpdateHabitSchedule(contextMenu.habitId, {
      startDate: contextMenu.startDate,
      endDate: contextMenu.endDate,
    });
    setContextMenu(null);
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!timerMenu) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTimerMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [timerMenu]);

  useEffect(() => {
    const hasRunningTimer = Object.keys(inlineTimers).some(habitId => {
      const timer = inlineTimers[habitId];
      return timer.running && timer.remaining > 0;
    });
    if (!hasRunningTimer) {
      return;
    }
    const id = window.setInterval(() => {
      setInlineTimers(prev => {
        const next: Record<string, InlineTimerState> = {};
        Object.keys(prev).forEach(habitId => {
          const timer = prev[habitId];
          if (!timer.running || timer.remaining <= 0) {
            next[habitId] = timer;
          } else {
            next[habitId] = {
              running: true,
              remaining: timer.remaining - 1,
            };
          }
        });
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [inlineTimers]);

  // Touch handling for mobile interactions
  const touchTimer = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPress = useRef(false);

  const handleMobileContextMenu = (clientX: number, clientY: number, type: 'empty' | 'event', param?: Habit) => {
    if (!timelineRef.current) return;
    
    // Calculate minutes based on touch position relative to timeline
    const rect = timelineRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    
    if (type === 'empty') {
      const minutes = snapMinutes(y);
      const maxStart = 24 * 60 - 60;
      const startMinutes = Math.max(0, Math.min(maxStart, minutes));
      setContextMenu({
        target: 'empty',
        minutes: startMinutes,
        x: clientX,
        y: clientY,
        name: 'New Task',
        startDate: selectedDateStr,
        endDate: selectedDateStr,
      });
    } else if (type === 'event' && param) {
      const { minutes: habitMinutes } = getHabitDisplay(param);
      setContextMenu({
        target: 'event',
        habitId: param.id,
        minutes: habitMinutes,
        x: clientX,
        y: clientY,
        name: param.title,
        startDate: param.startDate ?? selectedDateStr,
        endDate: param.endDate ?? selectedDateStr,
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent, type: 'empty' | 'event', param?: Habit, mode: InteractionMode = 'move') => {
    // Only handle single touch
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isLongPress.current = false;

    // Clear any existing timer
    if (touchTimer.current !== null) {
      window.clearTimeout(touchTimer.current);
    }

    touchTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
      if (type === 'event' && param) {
        // Start interaction (drag/resize) instead of context menu
        const { minutes: startMinutes, duration } = getHabitDisplay(param);
        startInteraction(param.id, mode, touch.clientY, startMinutes, duration);
      } else {
        handleMobileContextMenu(touch.clientX, touch.clientY, type, param);
      }
    }, 500); // 500ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // If moved more than 10px, cancel long press
    if (dx > 10 || dy > 10) {
      if (touchTimer.current !== null) {
        window.clearTimeout(touchTimer.current);
        touchTimer.current = null;
      }
      touchStartPos.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, type: 'empty' | 'event', param?: Habit) => {
    if (touchTimer.current !== null) {
      window.clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
    
    // Handle short press on event -> Edit
    // Only if we haven't triggered long press and we haven't moved significantly
    // AND we are NOT currently interacting (dragging/resizing)
    if (!isLongPress.current && type === 'event' && param && touchStartPos.current && !interaction) {
      e.preventDefault(); 
      const touch = e.changedTouches[0];
      handleMobileContextMenu(touch.clientX, touch.clientY, 'event', param);
    }
    
    touchStartPos.current = null;
    isLongPress.current = false;
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
                style={{ top: `${currentHongKongTime.minutes}px` }}
            >
                <div className="flex items-center -ml-1">
                  <div className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] mr-2">
                    {currentHongKongTime.label}
                  </div>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                </div>
            </div>
        )}

        {/* Hours Grid */}
        <div
          ref={timelineRef}
          className="relative min-h-[1440px]"
          onContextMenu={handleTimelineContextMenu}
          onTouchStart={(e) => handleTouchStart(e, 'empty')}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleTouchEnd(e, 'empty')}
        >
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

            const { minutes, duration, timeOfDay } = getHabitDisplay(habit);
            const top = minutes;
            const height = Math.max(duration, 30);

            const isCompleted = habit.completedDates.includes(selectedDateStr);
            const isInRange = isWithinRange(selectedDateStr, habit.startDate, habit.endDate);
            const inlineTimer = inlineTimers[habit.id];

            const handleEventMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              startInteraction(habit.id, 'move', event.clientY, minutes, duration);
            };

            const handleResizeMouseDown = (
              event: React.MouseEvent<HTMLDivElement>,
              mode: InteractionMode
            ) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              startInteraction(habit.id, mode, event.clientY, minutes, duration);
            };

            const handleEventContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
              event.preventDefault();
              event.stopPropagation();
              setContextMenu({
                target: 'event',
                habitId: habit.id,
                minutes,
                x: event.clientX,
                y: event.clientY,
                name: habit.title,
                startDate: habit.startDate ?? selectedDateStr,
                endDate: habit.endDate ?? selectedDateStr,
              });
            };

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
                onMouseDown={handleEventMouseDown}
                onContextMenu={handleEventContextMenu}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  handleTouchStart(e, 'event', habit);
                }}
                onTouchMove={(e) => {
                  e.stopPropagation();
                  handleTouchMove(e);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  handleTouchEnd(e, 'event', habit);
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (!isInRange) return;
                  onToggleHabit(habit.id, selectedDateStr);
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-4 -mt-2 cursor-n-resize z-20"
                  onMouseDown={(event) => handleResizeMouseDown(event, 'resize-top')}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleTouchStart(e, 'event', habit, 'resize-top');
                  }}
                  onTouchMove={(e) => {
                    e.stopPropagation();
                    handleTouchMove(e);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    handleTouchEnd(e, 'event', habit);
                  }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-4 -mb-2 cursor-s-resize z-20"
                  onMouseDown={(event) => handleResizeMouseDown(event, 'resize-bottom')}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleTouchStart(e, 'event', habit, 'resize-bottom');
                  }}
                  onTouchMove={(e) => {
                    e.stopPropagation();
                    handleTouchMove(e);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    handleTouchEnd(e, 'event', habit);
                  }}
                />
                <div className="flex justify-between items-start h-full">
                  <div className="flex flex-col h-full justify-between">
                    <span className={`font-semibold ${ASPECT_TEXT_COLORS[goalAspect]}`}>
                      {habit.title}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {format(new Date(0, 0, 0, Math.floor(minutes / 60), minutes % 60), 'h:mm a')} -{' '}
                      {format(new Date(0, 0, 0, Math.floor((minutes + duration) / 60), (minutes + duration) % 60), 'h:mm a')}
                    </span>
                    {(habit.startDate || habit.endDate) && (
                      <span className="text-slate-400 text-[10px]">
                        {habit.startDate ?? '—'} → {habit.endDate ?? '—'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <button
                      type="button"
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-white/70 hover:bg-white shadow-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setTimerMenu({
                          habit,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                    >
                      <TimerIcon className="w-3 h-3 text-slate-600" />
                    </button>
                    <button
                      type="button"
                      className={`rounded-full p-1 border ${
                        isCompleted ? `${goalColor} text-white border-transparent` : 'bg-white text-slate-400 border-slate-200'
                      } ${!isInRange ? 'opacity-40 cursor-not-allowed' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!isInRange) return;
                        onToggleHabit(habit.id, selectedDateStr);
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    {inlineTimer && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <button
                          type="button"
                          className="w-4 h-4 flex items-center justify-center rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                          onClick={event => {
                            event.stopPropagation();
                            const baseSeconds = (habit.recommendedDuration ?? 20) * 60;
                            setInlineTimers(prev => {
                              const current = prev[habit.id];
                              if (!current || current.remaining <= 0) {
                                return {
                                  ...prev,
                                  [habit.id]: {
                                    remaining: baseSeconds,
                                    running: true,
                                  },
                                };
                              }
                              return {
                                ...prev,
                                [habit.id]: {
                                  remaining: current.remaining,
                                  running: !current.running,
                                },
                              };
                            });
                          }}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                        >
                          {inlineTimer.running && inlineTimer.remaining > 0 ? (
                            <Pause className="w-2 h-2 text-emerald-600" />
                          ) : (
                            <Play className="w-2 h-2 text-emerald-600 translate-x-[1px]" />
                          )}
                        </button>
                        <span>{formatSeconds(inlineTimer.remaining)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {timerMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setTimerMenu(null)}
        >
          <div
            className="absolute bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-56 space-y-2"
            style={{ top: timerMenu.y, left: timerMenu.x }}
            onClick={event => event.stopPropagation()}
          >
            <div className="text-xs font-semibold text-slate-700 truncate">
              {timerMenu.habit.title}
            </div>
            <button
              type="button"
              onClick={() => {
                onStartTimer(timerMenu.habit);
                setTimerMenu(null);
              }}
              className="w-full text-sm font-medium px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              Full screen timer
            </button>
            <button
              type="button"
              onClick={() => {
                const seconds = (timerMenu.habit.recommendedDuration ?? 20) * 60;
                setInlineTimers(prev => ({
                  ...prev,
                  [timerMenu.habit.id]: { remaining: seconds, running: true },
                }));
                setTimerMenu(null);
              }}
              className="w-full text-sm font-medium px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              Inline timer in card
            </button>
          </div>
        </div>
      )}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        >
          <div
            className="absolute bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-56 space-y-3"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={event => event.stopPropagation()}
          >
            <input
              autoFocus
              value={contextMenu.name}
              onChange={event => handleContextNameChange(event.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Task name"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={contextMenu.startDate ?? ''}
                onChange={event => handleContextStartDateChange(event.target.value)}
                className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
              <input
                type="date"
                value={contextMenu.endDate ?? ''}
                onChange={event => handleContextEndDateChange(event.target.value)}
                className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            {contextMenu.target === 'empty' && (
              <button
                type="button"
                onClick={handleCreateFromContext}
                className="w-full text-sm font-medium px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700"
              >
                Create task here
              </button>
            )}
            {contextMenu.target === 'event' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleUpdateRangeFromContext}
                  className="w-full text-sm font-medium px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700"
                >
                  Update dates
                </button>
                <button
                  type="button"
                  onClick={handleRenameFromContext}
                  className="w-full text-sm font-medium px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                >
                  Rename task
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFromContext}
                  className="w-full text-sm font-medium px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Delete task
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
