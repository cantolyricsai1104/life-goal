import React from 'react';

interface ActivityCalendarProps {
  completedDates: string[]; // Set of strings YYYY-MM-DD
  colorClass: string;
}

export const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ completedDates, colorClass }) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // To make it look like a real calendar, we should align the grid to the days of the week.
  // We'll show the last 4 full weeks (28 days) plus whatever days are needed to complete the current week.
  
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Find the start date: Sunday of the week 3 weeks ago.
  const currentDayOfWeek = today.getDay(); // 0 is Sunday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - currentDayOfWeek - 21); // Go back to Sunday 3 weeks ago
  
  const days = [];
  const iterDate = new Date(startDate);
  
  // We'll show exactly 28 days (4 full weeks)
  for (let i = 0; i < 28; i++) {
    days.push({
      dateStr: iterDate.toISOString().split('T')[0],
      dayNum: iterDate.getDate(),
      month: iterDate.toLocaleString('default', { month: 'short' }),
      isFirstOfMonth: iterDate.getDate() === 1 || i === 0
    });
    iterDate.setDate(iterDate.getDate() + 1);
  }

  const completionSet = new Set(completedDates);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          Activity Map
        </h4>
        <div className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {days[0].month} - {days[days.length-1].month}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Weekday Headers */}
        {daysOfWeek.map((day, idx) => (
          <div key={idx} className="text-[9px] font-bold text-slate-300 text-center pb-1">
            {day}
          </div>
        ))}

        {/* Calendar Grid */}
        {days.map(({ dateStr, dayNum, isFirstOfMonth, month }) => {
          const isCompleted = completionSet.has(dateStr);
          const isToday = dateStr === todayStr;
          
          return (
            <div
              key={dateStr}
              title={dateStr}
              className={`
                relative aspect-square rounded-lg transition-all duration-300
                flex flex-col items-center justify-center border
                ${isCompleted 
                  ? `${colorClass} text-white border-transparent shadow-sm scale-105 z-10` 
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}
                ${isToday && !isCompleted ? 'ring-2 ring-violet-400 border-transparent' : ''}
              `}
            >
              <span className={`text-[10px] font-bold ${isCompleted ? 'text-white' : 'text-slate-700'}`}>
                {dayNum}
              </span>
              {isFirstOfMonth && !isCompleted && (
                <span className="absolute -top-1 -right-1 text-[7px] font-black uppercase text-slate-300 bg-white px-1 rounded-sm border border-slate-100">
                  {month}
                </span>
              )}
              {isToday && (
                 <div className={`absolute -bottom-1 w-1 h-1 rounded-full ${isCompleted ? 'bg-white' : 'bg-violet-500'}`} />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
             <div className="w-2 h-2 rounded-sm bg-slate-100 border border-slate-200"></div>
             <div className={`w-2 h-2 rounded-sm ${colorClass}`}></div>
          </div>
          <span className="text-[8px] text-slate-400 font-medium uppercase tracking-tighter">Consistency Key</span>
        </div>
        <span className="text-[8px] text-slate-300 font-bold uppercase tracking-tighter italic">Updated Live</span>
      </div>
    </div>
  );
};