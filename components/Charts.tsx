import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { Goal, LifeAspect } from '../types';

interface ChartProps {
  goals: Goal[];
}

export const LifeBalanceRadar: React.FC<ChartProps> = ({ goals }) => {
  const aspects = Object.values(LifeAspect);
  
  const data = aspects.map(aspect => {
    const aspectGoals = goals.filter(g => g.aspect === aspect);
    if (aspectGoals.length === 0) return { aspect, value: 30 }; // Baseline
    
    const totalProgress = aspectGoals.reduce((sum, g) => sum + g.progress, 0);
    const avgProgress = Math.round(totalProgress / aspectGoals.length);
    return { aspect, value: Math.max(20, avgProgress) }; // Visual minimum
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="aspect" tick={{ fill: '#64748b', fontSize: 10 }} />
          <Radar
            name="Life Balance"
            dataKey="value"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CompletionBarChart: React.FC<ChartProps> = ({ goals }) => {
  const data = goals.map(g => ({
    name: g.title.substring(0, 10) + (g.title.length > 10 ? '...' : ''),
    progress: g.progress,
    aspect: g.aspect
  }));

  const COLORS: Record<string, string> = {
    [LifeAspect.HEALTH]: '#10b981',
    [LifeAspect.RELATIONSHIPS]: '#f43f5e',
    [LifeAspect.FINANCE]: '#f59e0b',
    [LifeAspect.LEARNING]: '#3b82f6',
    [LifeAspect.CAREER]: '#6366f1',
    [LifeAspect.SPIRITUAL]: '#8b5cf6',
  };

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#94a3b8" />
          <YAxis hide />
          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
          <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.aspect] || '#cbd5e1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};