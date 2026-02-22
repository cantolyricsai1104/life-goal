import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trophy, BarChart3, Calendar } from './components/Icons';
import { Goal, LifeAspect, Habit } from './types';
import { GoalCard } from './components/GoalCard';
import { GoalWizard } from './components/GoalWizard';
import { FullScreenTimer } from './components/FullScreenTimer';
import { DailySchedule } from './components/DailySchedule';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { saveRecord } from './services/recordsService';
import { fetchUserGoals, upsertUserGoal, deleteUserGoal } from './services/goalsService';
import { v4 as uuidv4 } from 'uuid';

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

const App: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [filterAspect, setFilterAspect] = useState<LifeAspect | 'All'>('All');
  const [view, setView] = useState<'goals' | 'schedule'>('goals');
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const loadGoals = async () => {
      if (!user) {
        setGoals([]);
        return;
      }

      try {
        const remoteGoals = await fetchUserGoals(user);
        setGoals(remoteGoals);
      } catch (error) {
        console.error('Failed to load goals from Supabase', error);
      }
    };

    void loadGoals();
  }, [user]);

  const handleStartTimer = (habit: Habit) => {
    setActiveHabit(habit);
    setIsTimerOpen(true);
  };

  const handleTimerComplete = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    setGoals(prevGoals => prevGoals.map(goal => {
      const habitIndex = goal.habits.findIndex(h => h.id === habitId);
      if (habitIndex === -1) return goal;

      const habit = goal.habits[habitIndex];
      if (habit.completedDates.includes(today)) return goal;

      const updatedHabit = {
        ...habit,
        completedDates: [...habit.completedDates, today],
        streak: habit.streak + 1
      };

      const updatedHabits = [...goal.habits];
      updatedHabits[habitIndex] = updatedHabit;

      return { ...goal, habits: updatedHabits };
    }));
  };

  const handleAddGoal = async (goal: Goal) => {
    setGoals(prev => [goal, ...prev]);

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
    setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));

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
    setGoals(prev => prev.filter(g => g.id !== id));

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
    const today = new Date().toISOString().split('T')[0];
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
              <div className="relative group">
                <button
                  onClick={() => setView('goals')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'goals' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  My Goals
                </button>
                <div className="hidden group-hover:block absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-200 p-4 z-40">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Life Aspects</h3>
                  <div className="space-y-1">
                    {(['All', ...Object.values(LifeAspect)] as const).map(aspect => (
                      <button
                        key={aspect}
                        onClick={() => {
                          setFilterAspect(aspect);
                          setView('goals');
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
              </div>

              <button
                onClick={() => setView('schedule')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'schedule' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Schedule
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
            <button
              onClick={() => setIsWizardOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-md shadow-violet-100"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Goal</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex md:hidden bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-6">
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
        </div>

        {view === 'schedule' && (
          <DailySchedule goals={goals} onToggleHabit={habitId => handleTimerComplete(habitId)} />
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
