export enum LifeAspect {
  HEALTH = 'Health',
  RELATIONSHIPS = 'Relationships',
  FINANCE = 'Financial',
  LEARNING = 'Learning',
  CAREER = 'Career',
  SPIRITUAL = 'Spiritual',
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  completedDates: string[]; // ISO date strings YYYY-MM-DD
  streak: number;
  recommendedDuration?: number; // In minutes, optional
  timeOfDay?: string; // HH:MM format (24h), e.g., "08:00"
  targetDays?: number;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  aspect: LifeAspect;
  progress: number; // 0 to 100
  milestones: Milestone[];
  habits: Habit[];
  aiAdvice?: string;
  createdAt: number;
}

export interface AppState {
  goals: Goal[];
  userName: string;
}

export const ASPECT_COLORS: Record<LifeAspect, string> = {
  [LifeAspect.HEALTH]: 'bg-emerald-500',
  [LifeAspect.RELATIONSHIPS]: 'bg-rose-500',
  [LifeAspect.FINANCE]: 'bg-amber-500',
  [LifeAspect.LEARNING]: 'bg-blue-500',
  [LifeAspect.CAREER]: 'bg-indigo-500',
  [LifeAspect.SPIRITUAL]: 'bg-violet-500',
};

export const ASPECT_TEXT_COLORS: Record<LifeAspect, string> = {
  [LifeAspect.HEALTH]: 'text-emerald-600',
  [LifeAspect.RELATIONSHIPS]: 'text-rose-600',
  [LifeAspect.FINANCE]: 'text-amber-600',
  [LifeAspect.LEARNING]: 'text-blue-600',
  [LifeAspect.CAREER]: 'text-indigo-600',
  [LifeAspect.SPIRITUAL]: 'text-violet-600',
};
