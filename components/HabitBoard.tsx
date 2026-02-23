import React, { useMemo, useState } from 'react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from './Icons';

export type HabitType = 'good' | 'bad';

export type HabitItem = {
  id: string;
  title: string;
  type: HabitType;
  completedDates: string[];
  startDate?: string;
  endDate?: string;
};

interface HabitBoardProps {
  habits: HabitItem[];
  selectedDate: Date;
  onChangeDate: (next: Date) => void;
  onAddHabit: (type: HabitType, title: string, startDate?: string, endDate?: string) => void;
  onToggleHabit: (habitId: string, dateStr: string) => void;
  onRemoveHabit: (habitId: string) => void;
  onUpdateHabitDates: (habitId: string, startDate?: string, endDate?: string) => void;
}

export const HabitBoard: React.FC<HabitBoardProps> = ({
  habits,
  selectedDate,
  onChangeDate,
  onAddHabit,
  onToggleHabit,
  onRemoveHabit,
  onUpdateHabitDates,
}) => {
  const [goodInput, setGoodInput] = useState('');
  const [badInput, setBadInput] = useState('');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [goodStart, setGoodStart] = useState(todayStr);
  const [goodEnd, setGoodEnd] = useState(todayStr);
  const [badStart, setBadStart] = useState(todayStr);
  const [badEnd, setBadEnd] = useState(todayStr);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const [contextMenu, setContextMenu] = useState<{
    habitId: string;
    x: number;
    y: number;
    startDate?: string;
    endDate?: string;
  } | null>(null);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  const isWithinRange = (dateStr: string, startDate?: string, endDate?: string) => {
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  const goodHabits = habits.filter(habit => habit.type === 'good' && isWithinRange(selectedDateStr, habit.startDate, habit.endDate));
  const badHabits = habits.filter(habit => habit.type === 'bad' && isWithinRange(selectedDateStr, habit.startDate, habit.endDate));

  const handleAddGood = () => {
    const title = goodInput.trim();
    if (!title) return;
    onAddHabit('good', title, goodStart || undefined, goodEnd || undefined);
    setGoodInput('');
  };

  const handleAddBad = () => {
    const title = badInput.trim();
    if (!title) return;
    onAddHabit('bad', title, badStart || undefined, badEnd || undefined);
    setBadInput('');
  };

  const renderHabitItem = (habit: HabitItem) => {
    const isCompleted = habit.completedDates.includes(selectedDateStr);
    const isInRange = (!habit.startDate || habit.startDate <= selectedDateStr) &&
      (!habit.endDate || habit.endDate >= selectedDateStr);
    return (
      <div
        key={habit.id}
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({
            habitId: habit.id,
            x: event.clientX,
            y: event.clientY,
            startDate: habit.startDate ?? selectedDateStr,
            endDate: habit.endDate ?? selectedDateStr,
          });
        }}
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
      >
        <button
          type="button"
          onClick={() => {
            if (!isInRange) return;
            onToggleHabit(habit.id, selectedDateStr);
          }}
          className={`w-5 h-5 rounded border flex items-center justify-center ${
            isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'
          } ${!isInRange ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1">
          <div className={`text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            {habit.title}
          </div>
          {(habit.startDate || habit.endDate) && (
            <div className="text-[11px] text-slate-400">
              {habit.startDate ?? '—'} → {habit.endDate ?? '—'}
            </div>
          )}
        </div>
        {isCompleted && (
          <button
            type="button"
            onClick={() => onRemoveHabit(habit.id)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Remove
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeDate(addDays(selectedDate, -7))}
              className="p-1 hover:bg-slate-100 rounded-full"
            >
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <h2 className="text-lg font-bold text-slate-800">{format(selectedDate, 'MMMM yyyy')}</h2>
            <button
              type="button"
              onClick={() => onChangeDate(addDays(selectedDate, 7))}
              className="p-1 hover:bg-slate-100 rounded-full"
            >
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChangeDate(new Date())}
              className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
            >
              Today
            </button>
            <button type="button" className="p-2 hover:bg-slate-100 rounded-full">
              <CalendarIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {weekDays.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <div
                key={date.toISOString()}
                onClick={() => onChangeDate(date)}
                className={`flex flex-col items-center justify-center py-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-white shadow-sm' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs font-medium mb-1 ${isToday ? 'text-violet-600' : 'text-slate-400'}`}>
                  {format(date, 'EEE')}
                </span>
                <div
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : isToday
                      ? 'text-violet-600 bg-violet-50'
                      : 'text-slate-700'
                  }`}
                >
                  {format(date, 'd')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-700">Good Habits</h3>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              {goodHabits.length}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={goodInput}
              onChange={(event) => setGoodInput(event.target.value)}
              placeholder="Add a good habit"
              className="flex-1 px-3 py-2 rounded-xl border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="button"
              onClick={handleAddGood}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600"
            >
              Add
            </button>
          </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={goodStart}
            onChange={(event) => setGoodStart(event.target.value)}
            className="px-3 py-2 rounded-xl border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <input
            type="date"
            value={goodEnd}
            onChange={(event) => setGoodEnd(event.target.value)}
            className="px-3 py-2 rounded-xl border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
          <div className="space-y-2">
            {goodHabits.length === 0 ? (
              <div className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
                No good habits yet.
              </div>
            ) : (
              goodHabits.map(renderHabitItem)
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-rose-700">Bad Habits</h3>
            <span className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
              {badHabits.length}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={badInput}
              onChange={(event) => setBadInput(event.target.value)}
              placeholder="Add a bad habit"
              className="flex-1 px-3 py-2 rounded-xl border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
            <button
              type="button"
              onClick={handleAddBad}
              className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600"
            >
              Add
            </button>
          </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={badStart}
            onChange={(event) => setBadStart(event.target.value)}
            className="px-3 py-2 rounded-xl border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
          />
          <input
            type="date"
            value={badEnd}
            onChange={(event) => setBadEnd(event.target.value)}
            className="px-3 py-2 rounded-xl border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
          />
        </div>
          <div className="space-y-2">
            {badHabits.length === 0 ? (
              <div className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                No bad habits yet.
              </div>
            ) : (
              badHabits.map(renderHabitItem)
            )}
          </div>
        </div>
      </div>
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-56 space-y-3"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={event => event.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={contextMenu.startDate ?? ''}
                onChange={(event) =>
                  setContextMenu(prev => (prev ? { ...prev, startDate: event.target.value } : prev))
                }
                className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
              <input
                type="date"
                value={contextMenu.endDate ?? ''}
                onChange={(event) =>
                  setContextMenu(prev => (prev ? { ...prev, endDate: event.target.value } : prev))
                }
                className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateHabitDates(contextMenu.habitId, contextMenu.startDate, contextMenu.endDate);
                setContextMenu(null);
              }}
              className="w-full text-sm font-medium px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700"
            >
              Update dates
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
