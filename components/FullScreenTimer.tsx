import React, { useState, useEffect, useRef } from 'react';
import { X, MoreHorizontal, Play, Pause, Plus, ChevronLeft } from './Icons';
import { Habit } from '../types';

interface FullScreenTimerProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  onComplete: (habitId: string) => void;
}

export const FullScreenTimer: React.FC<FullScreenTimerProps> = ({
  isOpen,
  onClose,
  habit,
  onComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && habit) {
      // Reset timer when opened with a new habit
      setTimeLeft((habit.recommendedDuration || 30) * 60);
      setIsActive(false);
    }
  }, [isOpen, habit]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (habit) onComplete(habit.id);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, onComplete, habit]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addTime = () => {
    setTimeLeft(prev => prev + 5 * 60);
  };

  if (!isOpen || !habit) return null;

  const durationMinutes = habit.recommendedDuration || 30;
  const totalSeconds = durationMinutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  
  // SVG Circle config
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 bg-[#E0F7FA] flex flex-col items-center justify-between py-8 px-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        <div className="flex items-center gap-2">
           {/* Icon could go here */}
           <span className="font-semibold text-lg text-slate-800">{habit.title}</span>
        </div>
        <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
          <MoreHorizontal className="w-6 h-6 text-slate-800" />
        </button>
      </div>

      {/* Timer Circle */}
      <div className="relative flex items-center justify-center mt-10">
        <svg width="320" height="320" className="transform -rotate-90">
          {/* Track */}
          {/* <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="white"
            strokeWidth="24"
            fill="none"
          /> */}
          {/* Background Circle (White) */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="white"
            strokeWidth="24"
            fill="none"
          />
          
          {/* Progress Circle (Mint/Teal) - Wait, image shows white progress on mint bg? 
             Actually looking at the image:
             Background is light mint.
             There is a thick white circle track.
             There is a mint dot.
             Wait, is the white circle the progress or the track?
             Usually the colored part is progress. 
             But here the circle is white.
             Maybe the track is faint white/mint, and progress is solid white?
             Or maybe the track is white and the progress is INVISIBLE but the DOT moves?
             
             Let's look closer at the image.
             The circle is thick white.
             There is a mint dot at the top.
             The time is 00:30.
             If it's a 30 min timer, and it's at 00:30, it might be at the start.
             So the dot is at the start.
             
             Let's assume:
             Track: White, opacity 0.5?
             Progress: White, opacity 1?
             Dot: Mint.
             
             Let's try:
             Track: White
             Progress: Mint (same as dot)? No, the circle in image is white.
             
             Let's go with:
             Track: White opacity 0.3
             Progress: White opacity 1
             Dot: Mint
          */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="white"
            strokeWidth="24"
            fill="none"
            opacity="0.4"
          />
           <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="white"
            strokeWidth="24"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-medium text-slate-900 tracking-wider font-mono">
            {formatTime(timeLeft)}
          </span>
        </div>
        
        {/* Dot */}
        <div 
            className="absolute w-6 h-6 bg-[#4DB6AC] rounded-full shadow-md transition-all duration-1000 ease-linear z-10"
            style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${progress * 3.6}deg) translateY(-${radius}px)`
            }}
        />
      </div>

      {/* Controls */}
      <div className="w-full flex items-center justify-between px-8 mb-10">
        <div className="w-12" /> {/* Spacer */}
        
        <button 
          onClick={toggleTimer}
          className="w-20 h-14 bg-[#4DB6AC] rounded-full flex items-center justify-center shadow-lg hover:bg-[#26A69A] transition-colors active:scale-95"
        >
          {isActive ? (
            <Pause className="w-8 h-8 text-white fill-white" />
          ) : (
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          )}
        </button>

        <button 
          onClick={addTime}
          className="w-12 h-12 bg-[#E0F2F1] rounded-full flex items-center justify-center text-[#4DB6AC] hover:bg-[#B2DFDB] transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
