import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trophy, BarChart3, Calendar } from './components/Icons';
import { Goal, LifeAspect, Habit } from './types';
import { GoalCard } from './components/GoalCard';
import { GoalWizard } from './components/GoalWizard';
import { FullScreenTimer } from './components/FullScreenTimer';
import { DailySchedule } from './components/DailySchedule';
import { HabitBoard, HabitItem } from './components/HabitBoard';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { saveRecord } from './services/recordsService';
import { fetchUserGoals, upsertUserGoal, deleteUserGoal } from './services/goalsService';
import { fetchUserScheduleTasks, upsertUserScheduleTask, deleteUserScheduleTask } from './services/scheduleTasksService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const MOCK_GOALS: Goal[] = [
  {
    id: uuidv4(),
    title: "Run a Half Marathon",
    description: "Improve cardiovascular health and stamina by training for a 21km run.",
    aspect: LifeAspect.HEALTH,
    progress: 45,
    milestones: [
      { id: uuidv4(), title: "Run 5k without stopping", completed: true },
      { id: uuidv4(), title: "Run 10k under 60 mins", completed: true },
      { id: uuidv4(), title: "Complete 15k training run", completed: false }
    ],
    habits: [
      { id: uuidv4(), title: "Morning training run", frequency: 'daily', completedDates: [], streak: 5, recommendedDuration: 45, timeOfDay: "06:30" },
      { id: uuidv4(), title: "Stretching routine", frequency: 'daily', completedDates: [], streak: 3, recommendedDuration: 10, timeOfDay: "07:30" }
    ],
    createdAt: Date.now()
  },
  {
    id: uuidv4(),
    title: "Master React & TypeScript",
    description: "Build 5 production-ready applications to master the ecosystem.",
    aspect: LifeAspect.LEARNING,
    progress: 70,
    milestones: [
      { id: uuidv4(), title: "Learn TypeScript Generics", completed: true },
      { id: uuidv4(), title: "Build a Todo App", completed: true },
      { id: uuidv4(), title: "Build a Fullstack App", completed: false }
    ],
    habits: [
      { id: uuidv4(), title: "Deep Focus Coding Session", frequency: 'daily', completedDates: [], streak: 12, recommendedDuration: 90, timeOfDay: "20:00" }
    ],
    createdAt: Date.now()
  }
];

const goalsStorageKey = (userId: string) => `life-goal:goals:${userId}`;
const scheduleStorageKey = (userId: string) => `life-goal:schedule-tasks:${userId}`;
const habitsStorageKey = (userId: string) => `life-goal:habits:${userId}`;

type AppSnapshot = {
  goals: Goal[];
  scheduleTasks: Habit[];
  habitItems: HabitItem[];
};

const loadGoalsFromStorage = (userId: string | null | undefined): Goal[] => {
  if (typeof window === 'undefined' || !userId) return [];
  const raw = window.localStorage.getItem(goalsStorageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Goal[]) : [];
  } catch (error) {
    console.error('Failed to parse goals from localStorage', error);
    return [];
  }
};

const persistGoalsToStorage = (userId: string | null | undefined, nextGoals: Goal[]) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(goalsStorageKey(userId), JSON.stringify(nextGoals));
  } catch (error) {
    console.error('Failed to persist goals to localStorage', error);
  }
};

type ScheduleTasksLocalSnapshot = {
  tasks: Habit[];
  updatedAt: number | null;
};

const loadScheduleTasksFromStorage = (userId: string | null | undefined): ScheduleTasksLocalSnapshot => {
  if (typeof window === 'undefined' || !userId) return { tasks: [], updatedAt: null };
  const raw = window.localStorage.getItem(scheduleStorageKey(userId));
  if (!raw) return { tasks: [], updatedAt: null };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { tasks: parsed as Habit[], updatedAt: null };
    }
    const tasks = Array.isArray(parsed?.tasks) ? (parsed.tasks as Habit[]) : [];
    const updatedAt = typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : null;
    return { tasks, updatedAt };
  } catch (error) {
    console.error('Failed to parse schedule tasks from localStorage', error);
    return { tasks: [], updatedAt: null };
  }
};

const persistScheduleTasksToStorage = (
  userId: string | null | undefined,
  tasks: Habit[],
  updatedAt: number
) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(
      scheduleStorageKey(userId),
      JSON.stringify({ updatedAt, tasks })
    );
  } catch (error) {
    console.error('Failed to persist schedule tasks to localStorage', error);
  }
};

const loadHabitItemsFromStorage = (userId: string | null | undefined): HabitItem[] => {
  if (typeof window === 'undefined' || !userId) return [];
  const raw = window.localStorage.getItem(habitsStorageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HabitItem[]) : [];
  } catch (error) {
    console.error('Failed to parse habit items from localStorage', error);
    return [];
  }
};

const persistHabitItemsToStorage = (userId: string | null | undefined, items: HabitItem[]) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(habitsStorageKey(userId), JSON.stringify(items));
  } catch (error) {
    console.error('Failed to persist habit items to localStorage', error);
  }
};

const App: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<Habit[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [filterAspect, setFilterAspect] = useState<LifeAspect | 'All'>('All');
  const [view, setView] = useState<'goals' | 'schedule' | 'habits'>('goals');
  const [habitItems, setHabitItems] = useState<HabitItem[]>([]);
  const [habitDate, setHabitDate] = useState(new Date());
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isLifeAspectsOpen, setIsLifeAspectsOpen] = useState(false);
  const { user, loading } = useAuth();
  const [lastGoalsPersistAt, setLastGoalsPersistAt] = useState<number | null>(null);
  const [lastSchedulePersistAt, setLastSchedulePersistAt] = useState<number | null>(null);
  const [localScheduleUpdatedAt, setLocalScheduleUpdatedAt] = useState<number | null>(null);
  const [remoteScheduleUpdatedAt, setRemoteScheduleUpdatedAt] = useState<number | null>(null);
  const [dataHydrated, setDataHydrated] = useState(false);
  const [history, setHistory] = useState<AppSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleLogout = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setDataHydrated(false);
      if (!user) {
        setGoals([]);
        setScheduleTasks([]);
        setHabitItems([]);
        setHistory([]);
        setHistoryIndex(-1);
        return;
      }

      const localGoals = loadGoalsFromStorage(user.id);
      const localScheduleSnapshot = loadScheduleTasksFromStorage(user.id);
      const localHabitItems = loadHabitItemsFromStorage(user.id);
      setLocalScheduleUpdatedAt(localScheduleSnapshot.updatedAt);
      try {
        const [remoteGoals, remoteTasks] = await Promise.all([
          fetchUserGoals(user),
          fetchUserScheduleTasks(user),
        ]);
        const resolvedGoals = remoteGoals.length > 0 ? remoteGoals : localGoals;
        setRemoteScheduleUpdatedAt(remoteTasks.latestUpdatedAt);
        const shouldPreferLocal =
          localScheduleSnapshot.tasks.length > 0 &&
          (remoteTasks.tasks.length === 0 ||
            (localScheduleSnapshot.updatedAt !== null &&
              (!remoteTasks.latestUpdatedAt ||
                localScheduleSnapshot.updatedAt >= remoteTasks.latestUpdatedAt)));
        const resolvedScheduleTasks = shouldPreferLocal ? localScheduleSnapshot.tasks : remoteTasks.tasks;
        const snapshot: AppSnapshot = {
          goals: resolvedGoals,
          scheduleTasks: resolvedScheduleTasks,
          habitItems: localHabitItems,
        };
        setGoals(resolvedGoals);
        setScheduleTasks(resolvedScheduleTasks);
        setHabitItems(localHabitItems);
        setHistory([snapshot]);
        setHistoryIndex(0);
      } catch (error) {
        console.error('Failed to load data from Supabase', error);
      } finally {
        setDataHydrated(true);
      }
    };

    void loadData();
  }, [user]);

  useEffect(() => {
    if (!user || !dataHydrated) return;
    const updatedAt = Date.now();
    persistScheduleTasksToStorage(user.id, scheduleTasks, updatedAt);
    setLastSchedulePersistAt(updatedAt);
    setLocalScheduleUpdatedAt(updatedAt);
  }, [scheduleTasks, user, dataHydrated]);

  useEffect(() => {
    if (!user || !dataHydrated) return;
    persistGoalsToStorage(user.id, goals);
    setLastGoalsPersistAt(Date.now());
  }, [goals, user, dataHydrated]);

  useEffect(() => {
    if (!user || !dataHydrated) return;
    persistHabitItemsToStorage(user.id, habitItems);
  }, [habitItems, user, dataHydrated]);

  const recordSnapshot = (snapshot: AppSnapshot) => {
    if (!dataHydrated) return;
    setHistoryIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      setHistory(prev => {
        const trimmed = prev.slice(0, nextIndex);
        trimmed.push(snapshot);
        return trimmed;
      });
      return nextIndex;
    });
  };

  const applySnapshot = (snapshot: AppSnapshot, record: boolean) => {
    setGoals(snapshot.goals);
    setScheduleTasks(snapshot.scheduleTasks);
    setHabitItems(snapshot.habitItems);
    if (record) {
      recordSnapshot(snapshot);
    }
  };

  const syncSnapshotToRemote = (next: AppSnapshot, previous: AppSnapshot) => {
    if (!user) return;
    const nextGoalIds = new Set(next.goals.map(goal => goal.id));
    const prevGoalIds = new Set(previous.goals.map(goal => goal.id));
    const goalsToDelete = previous.goals.filter(goal => !nextGoalIds.has(goal.id));
    const goalsToUpsert = next.goals;
    const nextTaskIds = new Set(next.scheduleTasks.map(task => task.id));
    const prevTaskIds = new Set(previous.scheduleTasks.map(task => task.id));
    const tasksToDelete = previous.scheduleTasks.filter(task => !nextTaskIds.has(task.id));
    const tasksToUpsert = next.scheduleTasks;
    void Promise.all([
      ...goalsToUpsert.map(goal => upsertUserGoal(user, goal)),
      ...goalsToDelete.map(goal => deleteUserGoal(user, goal.id)),
      ...tasksToUpsert.map(task => upsertUserScheduleTask(user, task)),
      ...tasksToDelete.map(task => deleteUserScheduleTask(user, task.id)),
    ]).catch((error) => {
      console.error('Failed to sync undo/redo snapshot to Supabase', error);
    });
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;
    const prevSnapshot = history[historyIndex - 1];
    if (!prevSnapshot) return;
    const currentSnapshot = history[historyIndex];
    setHistoryIndex(historyIndex - 1);
    applySnapshot(prevSnapshot, false);
    if (currentSnapshot) {
      syncSnapshotToRemote(prevSnapshot, currentSnapshot);
    }
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const nextSnapshot = history[historyIndex + 1];
    if (!nextSnapshot) return;
    const currentSnapshot = history[historyIndex];
    setHistoryIndex(historyIndex + 1);
    applySnapshot(nextSnapshot, false);
    if (currentSnapshot) {
      syncSnapshotToRemote(nextSnapshot, currentSnapshot);
    }
  };

  const handleStartTimer = (habit: Habit) => {
    setActiveHabit(habit);
    setIsTimerOpen(true);
  };

  const handleTimerComplete = (habitId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');

    const goal = goals.find(g => g.habits.some(h => h.id === habitId));
    if (goal) {
      const updatedHabits = goal.habits.map(habit => {
        if (habit.id !== habitId) return habit;
        if (habit.completedDates.includes(today)) return habit;

        return {
          ...habit,
          completedDates: [...habit.completedDates, today],
          streak: habit.streak + 1,
        };
      });

      const updatedGoal: Goal = { ...goal, habits: updatedHabits };
      handleUpdateGoal(updatedGoal);
      return;
    }

    const updatedTasks = scheduleTasks.map(habit => {
      if (habit.id !== habitId) return habit;
      if (habit.completedDates.includes(today)) return habit;
      return {
        ...habit,
        completedDates: [...habit.completedDates, today],
        streak: habit.streak + 1,
      };
    });
    applySnapshot({ goals, scheduleTasks: updatedTasks, habitItems }, true);

    if (user) {
      const updatedTask = updatedTasks.find(h => h.id === habitId);
      if (updatedTask) {
        void upsertUserScheduleTask(user, updatedTask).catch((error) => {
          console.error('Failed to persist schedule task completion to Supabase', error);
        });
      }
    }
  };

  const handleToggleHabitCompletion = (habitId: string, dateStr?: string) => {
    const today = dateStr ?? format(new Date(), 'yyyy-MM-dd');

    const goal = goals.find(g => g.habits.some(h => h.id === habitId));
    if (goal) {
      let changed = false;
      const updatedHabits = goal.habits.map(habit => {
        if (habit.id !== habitId) return habit;
        const isCompleted = habit.completedDates.includes(today);
        const completedDates = isCompleted
          ? habit.completedDates.filter(date => date !== today)
          : [...habit.completedDates, today];
        const streak = isCompleted ? Math.max(0, habit.streak - 1) : habit.streak + 1;
        changed = true;
        return { ...habit, completedDates, streak };
      });

      if (!changed) return;

      const updatedGoal: Goal = { ...goal, habits: updatedHabits };
      handleUpdateGoal(updatedGoal);
      return;
    }

    const updatedTasks = scheduleTasks.map(habit => {
      if (habit.id !== habitId) return habit;
      const isCompleted = habit.completedDates.includes(today);
      const completedDates = isCompleted
        ? habit.completedDates.filter(date => date !== today)
        : [...habit.completedDates, today];
      const streak = isCompleted ? Math.max(0, habit.streak - 1) : habit.streak + 1;
      return { ...habit, completedDates, streak };
    });
    applySnapshot({ goals, scheduleTasks: updatedTasks, habitItems }, true);

    if (user) {
      const updatedTask = updatedTasks.find(h => h.id === habitId);
      if (updatedTask) {
        void upsertUserScheduleTask(user, updatedTask).catch((error) => {
          console.error('Failed to persist schedule task toggle to Supabase', error);
        });
      }
    }
  };

  const handleUpdateHabitSchedule = (habitId: string, updates: Partial<Habit>) => {
    const goal = goals.find(g => g.habits.some(h => h.id === habitId));
    if (goal) {
      const updatedHabits = goal.habits.map(h =>
        h.id === habitId ? { ...h, ...updates } : h
      );

      const updatedGoal: Goal = { ...goal, habits: updatedHabits };
      handleUpdateGoal(updatedGoal);
      return;
    }

    const updatedTasks = scheduleTasks.map(h => (h.id === habitId ? { ...h, ...updates } : h));
    applySnapshot({ goals, scheduleTasks: updatedTasks, habitItems }, true);

    if (user) {
      const updatedTask = updatedTasks.find(h => h.id === habitId);
      if (updatedTask) {
        void upsertUserScheduleTask(user, updatedTask).catch((error) => {
          console.error('Failed to persist schedule task update to Supabase', error);
        });
      }
    }
  };

  const handleCreateHabitFromSchedule = (
    timeOfDay: string,
    duration: number,
    title: string,
    startDate?: string,
    endDate?: string
  ) => {
    const newHabit: Habit = {
      id: uuidv4(),
      title,
      frequency: 'daily',
      completedDates: [],
      streak: 0,
      recommendedDuration: duration,
      timeOfDay,
      startDate,
      endDate,
    };

    const updatedTasks = [...scheduleTasks, newHabit];
    applySnapshot({ goals, scheduleTasks: updatedTasks, habitItems }, true);

    if (user) {
      void upsertUserScheduleTask(user, newHabit).catch((error) => {
        console.error('Failed to persist schedule task to Supabase', error);
      });
    }
  };

  const handleDeleteHabitFromSchedule = (habitId: string) => {
    const goal = goals.find(g => g.habits.some(h => h.id === habitId));
    if (goal) {
      const updatedGoal: Goal = {
        ...goal,
        habits: goal.habits.filter(h => h.id !== habitId),
      };

      handleUpdateGoal(updatedGoal);
      return;
    }

    const updatedTasks = scheduleTasks.filter(habit => habit.id !== habitId);
    applySnapshot({ goals, scheduleTasks: updatedTasks, habitItems }, true);

    if (user) {
      void deleteUserScheduleTask(user, habitId).catch((error) => {
        console.error('Failed to delete schedule task from Supabase', error);
      });
    }
  };

  const handleAddHabitItem = (type: 'good' | 'bad', title: string, startDate?: string, endDate?: string) => {
    const next: HabitItem = {
      id: uuidv4(),
      title,
      type,
      completedDates: [],
      startDate,
      endDate,
    };
    const updatedItems = [next, ...habitItems];
    applySnapshot({ goals, scheduleTasks, habitItems: updatedItems }, true);
  };

  const handleToggleHabitItem = (habitId: string, dateStr: string) => {
    const updatedItems = habitItems.map(item => {
      if (item.id !== habitId) return item;
      const isCompleted = item.completedDates.includes(dateStr);
      const completedDates = isCompleted
        ? item.completedDates.filter(date => date !== dateStr)
        : [...item.completedDates, dateStr];
      return { ...item, completedDates };
    });
    applySnapshot({ goals, scheduleTasks, habitItems: updatedItems }, true);
  };

  const handleRemoveHabitItem = (habitId: string) => {
    const updatedItems = habitItems.filter(item => item.id !== habitId);
    applySnapshot({ goals, scheduleTasks, habitItems: updatedItems }, true);
  };

  const handleAddGoal = async (goal: Goal) => {
    const updatedGoals = [goal, ...goals];
    applySnapshot({ goals: updatedGoals, scheduleTasks, habitItems }, true);

    if (user) {
      try {
        await Promise.all([
          saveRecord(user, 'goal_created', {
            id: goal.id,
            title: goal.title,
            aspect: goal.aspect,
          }),
          upsertUserGoal(user, goal),
        ]);
      } catch (error) {
        console.error('Failed to persist new goal to Supabase', error);
      }
    }
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    const updatedGoals = goals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
    applySnapshot({ goals: updatedGoals, scheduleTasks, habitItems }, true);

    if (user) {
      void Promise.all([
        saveRecord(user, 'goal_updated', {
          id: updatedGoal.id,
          title: updatedGoal.title,
          aspect: updatedGoal.aspect,
          progress: updatedGoal.progress,
        }),
        upsertUserGoal(user, updatedGoal),
      ]).catch((error) => {
        console.error('Failed to persist goal update to Supabase', error);
      });
    }
  };

  const handleDeleteGoal = (id: string) => {
    const updatedGoals = goals.filter(g => g.id !== id);
    applySnapshot({ goals: updatedGoals, scheduleTasks, habitItems }, true);

    if (user) {
      void Promise.all([
        saveRecord(user, 'goal_deleted', { id }),
        deleteUserGoal(user, id),
      ]).catch((error) => {
        console.error('Failed to persist goal delete to Supabase', error);
      });
    }
  };

  const filteredGoals = useMemo(() => {
    if (filterAspect === 'All') return goals;
    return goals.filter(g => g.aspect === filterAspect);
  }, [goals, filterAspect]);

  const activeHabitsCount = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return goals.reduce((acc, goal) => {
      return acc + goal.habits.filter(h => h.completedDates.includes(today)).length;
    }, 0);
  }, [goals]);

  const totalHabits = useMemo(() => {
    return goals.reduce((acc, goal) => acc + goal.habits.length, 0);
  }, [goals]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-200">
              L
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">LifeArchitect</span>
          </div>

          <div className="hidden md:flex flex-1 justify-center">
            <div className="bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200 flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => {
                    setView('goals');
                    setIsLifeAspectsOpen(prev => !prev);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'goals' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  My Goals
                </button>
                {isLifeAspectsOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-200 p-4 z-40">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Life Aspects</h3>
                    <div className="space-y-1">
                      {(['All', ...Object.values(LifeAspect)] as const).map(aspect => (
                        <button
                          key={aspect}
                          onClick={() => {
                            setFilterAspect(aspect);
                            setView('goals');
                            setIsLifeAspectsOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                            filterAspect === aspect
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {aspect}
                          {aspect !== 'All' && (
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              {goals.filter(g => g.aspect === aspect).length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setView('schedule');
                  setIsLifeAspectsOpen(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'schedule' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Schedule
              </button>
              <button
                onClick={() => {
                  setView('habits');
                  setIsLifeAspectsOpen(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'habits' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Habits
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Today: {activeHabitsCount}/{totalHabits} Habits
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:border-slate-100"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:border-slate-100"
              >
                Redo
              </button>
            </div>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-md shadow-violet-100"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Goal</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex md:hidden bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-4">
          <button
            onClick={() => setView('goals')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'goals' ? 'bg-violet-50 text-violet-700' : 'text-slate-500'}`}
          >
            My Goals
          </button>
          <button
            onClick={() => setView('schedule')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'schedule' ? 'bg-violet-50 text-violet-700' : 'text-slate-500'}`}
          >
            Schedule
          </button>
          <button
            onClick={() => setView('habits')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'habits' ? 'bg-violet-50 text-violet-700' : 'text-slate-500'}`}
          >
            Habits
          </button>
        </div>

        {view === 'goals' && (
          <div className="md:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Life Aspects</h3>
            <div className="space-y-1">
              {(['All', ...Object.values(LifeAspect)] as const).map(aspect => (
                <button
                  key={aspect}
                  onClick={() => setFilterAspect(aspect)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                    filterAspect === aspect
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {aspect}
                  {aspect !== 'All' && (
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                      {goals.filter(g => g.aspect === aspect).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'schedule' && (
          <div className="space-y-4">
            <DailySchedule
              goals={goals}
              scheduleTasks={scheduleTasks}
              onToggleHabit={handleToggleHabitCompletion}
              onUpdateHabitSchedule={handleUpdateHabitSchedule}
              onCreateHabit={handleCreateHabitFromSchedule}
              onDeleteHabit={handleDeleteHabitFromSchedule}
              onStartTimer={handleStartTimer}
            />
          </div>
        )}

        {view === 'habits' && (
          <HabitBoard
            habits={habitItems}
            selectedDate={habitDate}
            onChangeDate={setHabitDate}
            onAddHabit={handleAddHabitItem}
            onToggleHabit={handleToggleHabitItem}
            onRemoveHabit={handleRemoveHabitItem}
            onUpdateHabitDates={(habitId, startDate, endDate) => {
              const updatedItems = habitItems.map(item =>
                item.id === habitId ? { ...item, startDate, endDate } : item
              );
              applySnapshot({ goals, scheduleTasks, habitItems: updatedItems }, true);
            }}
          />
        )}

        {view === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                Active Goals
              </h2>
              <span className="text-sm text-slate-500">{filteredGoals.length} goals found</span>
            </div>

            {filteredGoals.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No goals found</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2 mb-6">
                  Start by creating a new goal or selecting a different category.
                </p>
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Create Goal
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onUpdateGoal={handleUpdateGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onStartTimer={handleStartTimer}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* AI Wizard Modal */}
      {isWizardOpen && (
        <GoalWizard 
          onAddGoal={handleAddGoal} 
          onClose={() => setIsWizardOpen(false)} 
        />
      )}

      {/* Full Screen Timer */}
      <FullScreenTimer 
        isOpen={isTimerOpen} 
        onClose={() => setIsTimerOpen(false)} 
        habit={activeHabit}
        onComplete={handleTimerComplete}
      />
    </div>
  );
};

export default App;
