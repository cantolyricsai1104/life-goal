import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Timer } from './Icons';

interface HabitTimerProps {
  durationMinutes: number;
  onComplete: () => void;
  disabled?: boolean;
}

export const HabitTimer: React.FC<HabitTimerProps> = ({ durationMinutes, onComplete, disabled }) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      onComplete();
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setIsActive(!isActive);
  };

  const resetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActive(false);
    setTimeLeft(durationMinutes * 60);
  };

  return (
    <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
      <Timer className={`w-3.5 h-3.5 ${isActive ? 'text-violet-600 animate-pulse' : 'text-slate-400'}`} />
      <span className="text-xs font-mono font-medium text-slate-700 w-10">
        {formatTime(timeLeft)}
      </span>
      <button 
        onClick={toggleTimer}
        disabled={disabled}
        className={`p-1 rounded hover:bg-white transition-colors ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      >
        {isActive ? <Square className="w-3 h-3 text-red-500 fill-red-500" /> : <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />}
      </button>
      {timeLeft < durationMinutes * 60 && !isActive && (
         <button onClick={resetTimer} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-tighter">Reset</button>
      )}
    </div>
  );
};