import React from 'react';
import { 
  Activity, 
  Heart, 
  DollarSign, 
  BookOpen, 
  Briefcase, 
  Zap, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles,
  Trophy,
  BarChart3,
  Calendar,
  ChevronRight,
  Play,
  Square,
  Timer,
  X,
  MoreHorizontal,
  Pause,
  ChevronLeft
} from 'lucide-react';
import { LifeAspect } from '../types';

export const AspectIcon = ({ aspect, className = "w-5 h-5" }: { aspect: LifeAspect; className?: string }) => {
  switch (aspect) {
    case LifeAspect.HEALTH: return <Activity className={className} />;
    case LifeAspect.RELATIONSHIPS: return <Heart className={className} />;
    case LifeAspect.FINANCE: return <DollarSign className={className} />;
    case LifeAspect.LEARNING: return <BookOpen className={className} />;
    case LifeAspect.CAREER: return <Briefcase className={className} />;
    case LifeAspect.SPIRITUAL: return <Zap className={className} />;
    default: return <Sparkles className={className} />;
  }
};

export { 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  Trophy, 
  BarChart3, 
  Calendar,
  ChevronRight,
  Play,
  Square,
  Timer,
  X,
  MoreHorizontal,
  Pause,
  ChevronLeft
};