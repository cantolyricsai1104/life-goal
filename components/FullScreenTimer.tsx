import React, { useState, useEffect, useRef } from 'react';
import { X, MoreHorizontal, Play, Pause, Plus, ChevronLeft } from './Icons';
import { Habit } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserTimerMemos, upsertUserTimerMemo, deleteUserTimerMemo } from '../services/timerMemosService';
import { v4 as uuidv4 } from 'uuid';

interface FullScreenTimerProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  onComplete: (habitId: string) => void;
}

type MemoType = 'text' | 'todo';

interface MemoTodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface Memo {
  id: string;
  x: number;
  y: number;
  type: MemoType;
  text: string;
  items: MemoTodoItem[];
}

interface MemoContextMenu {
  x: number;
  y: number;
  target: 'canvas' | 'memo';
  memoId?: string;
}

interface MemoDragState {
  memoId: string;
  offsetX: number;
  offsetY: number;
}

export const FullScreenTimer: React.FC<FullScreenTimerProps> = ({
  isOpen,
  onClose,
  habit,
  onComplete
}) => {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [contextMenu, setContextMenu] = useState<MemoContextMenu | null>(null);
  const [dragState, setDragState] = useState<MemoDragState | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastPersistAt, setLastPersistAt] = useState<number | null>(null);
  const [lastLoadSource, setLastLoadSource] = useState<string | null>(null);
  const [lastRemoteStatus, setLastRemoteStatus] = useState<string | null>(null);
  const [lastRemoteAt, setLastRemoteAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [localUpdatedAt, setLocalUpdatedAt] = useState<number | null>(null);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const createId = () => uuidv4();

  const getStorageKey = (habitId: string) => {
    return `timer-memos:${habitId}`;
  };

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  };

  const normalizeMemoPosition = (memo: Memo) => {
    if (typeof window === 'undefined') return memo;
    const memoWidth = 260;
    const memoHeight = memo.type === 'todo' ? 240 : 180;
    const minX = memoWidth / 2 + 8;
    const maxX = window.innerWidth - memoWidth / 2 - 8;
    const minY = memoHeight / 2 + 8;
    const maxY = window.innerHeight - memoHeight / 2 - 8;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const xRaw = Number.isFinite(memo.x) ? memo.x : centerX;
    const yRaw = Number.isFinite(memo.y) ? memo.y : centerY;
    const x = maxX >= minX ? clamp(xRaw, minX, maxX) : centerX;
    const y = maxY >= minY ? clamp(yRaw, minY, maxY) : centerY;
    return { ...memo, x, y };
  };

  const normalizeMemos = (list: Memo[]) => {
    const next = list.map(normalizeMemoPosition);
    const changed = next.some((memo, index) => {
      const original = list[index];
      return memo.x !== original?.x || memo.y !== original?.y;
    });
    return { next, changed };
  };

  const recenterMemos = () => {
    if (!habit || typeof window === 'undefined') return;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const step = 24;
    const next = memos.map((memo, index) => ({
      ...memo,
      x: centerX + (index % 2 === 0 ? -1 : 1) * Math.min(4, index + 1) * step,
      y: centerY + index * step,
    }));
    setMemos(next);
    persistMemosToStorage(habit.id, next);
    if (user) {
      next.forEach((memo) => {
        void upsertUserTimerMemo(user, habit.id, memo.id, memo).catch((error) => {
          console.error('Failed to persist timer memo update to Supabase', error);
        });
      });
    }
  };

  const persistMemosToStorage = (habitId: string, nextMemos: Memo[]) => {
    if (typeof window === 'undefined') return;
    try {
      const key = getStorageKey(habitId);
      const updatedAt = Date.now();
      window.localStorage.setItem(key, JSON.stringify({ updatedAt, memos: nextMemos }));
      setLastPersistAt(updatedAt);
      setLocalUpdatedAt(updatedAt);
      const raw = window.localStorage.getItem(key);
      setStorageBytes(raw ? raw.length : 0);
      const keys = Object.keys(window.localStorage)
        .filter(storageKey => storageKey.startsWith('timer-memos:'))
        .sort();
      setStorageKeys(keys);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastError(message);
      console.error('Failed to persist timer memos to localStorage', error);
    }
  };

  useEffect(() => {
    if (isOpen && habit) {
      setTimeLeft((habit.recommendedDuration || 30) * 60);
      setIsActive(false);
      let loadedFromStorage = false;
      if (typeof window !== 'undefined') {
        const key = getStorageKey(habit.id);
        const legacyKeys: string[] = [];
        if (user) {
          legacyKeys.push(`timer-memos:${user.id}:${habit.id}`);
        }
        legacyKeys.push(`timer-memos:anon:${habit.id}`);
        const keysToTry = [key, ...legacyKeys];
        for (const storageKey of keysToTry) {
          const raw = window.localStorage.getItem(storageKey);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw) as { updatedAt?: number; memos?: Memo[] } | Memo[];
            const memosRaw = Array.isArray(parsed) ? parsed : parsed.memos ?? [];
            const { next, changed } = normalizeMemos(memosRaw);
            setMemos(next);
            loadedFromStorage = true;
            setLastLoadSource(`localStorage:${storageKey}`);
            if (!Array.isArray(parsed) && typeof parsed.updatedAt === 'number') {
              setLocalUpdatedAt(parsed.updatedAt);
            } else {
              setLocalUpdatedAt(null);
            }
            if (storageKey !== key || changed || Array.isArray(parsed)) {
              const updatedAt = typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.updatedAt === 'number'
                ? parsed.updatedAt
                : Date.now();
              window.localStorage.setItem(key, JSON.stringify({ updatedAt, memos: next }));
            }
            break;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setLastError(message);
            console.error('Failed to parse timer memos from localStorage', error);
          }
        }
        if (!loadedFromStorage) {
          setMemos([]);
          setLastLoadSource('localStorage:empty');
        }
        const raw = window.localStorage.getItem(key);
        setStorageBytes(raw ? raw.length : 0);
        const keys = Object.keys(window.localStorage)
          .filter(storageKey => storageKey.startsWith('timer-memos:'))
          .sort();
        setStorageKeys(keys);
      }
      if (user) {
        void fetchUserTimerMemos(user, habit.id)
          .then((stored) => {
            const payloads = stored ?? [];
            const remote = payloads.map((row) => row.payload) as Memo[];
            const latestRemote = payloads.reduce<number | null>((acc, row) => {
              if (!row.updated_at) return acc;
              const value = Date.parse(row.updated_at);
              if (Number.isNaN(value)) return acc;
              return acc === null ? value : Math.max(acc, value);
            }, null);
            if (remote.length > 0) {
              if (!localUpdatedAt || !latestRemote || latestRemote >= localUpdatedAt) {
                const { next } = normalizeMemos(remote);
                setMemos(next);
                persistMemosToStorage(habit.id, next);
              }
            }
            setLastRemoteStatus(`remote:${remote.length}`);
            setLastRemoteAt(Date.now());
            setRemoteUpdatedAt(latestRemote);
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            setLastRemoteStatus('remote:error');
            setLastRemoteAt(Date.now());
            setLastError(message);
            console.error('Failed to load timer memos from Supabase', error);
          });
      }
    } else if (!isOpen) {
      setMemos([]);
    }
  }, [isOpen, habit, user]);

  useEffect(() => {
    if (!debugOpen || typeof window === 'undefined' || !habit) return;
    const key = getStorageKey(habit.id);
    const raw = window.localStorage.getItem(key);
    setStorageBytes(raw ? raw.length : 0);
    const keys = Object.keys(window.localStorage)
      .filter(storageKey => storageKey.startsWith('timer-memos:'))
      .sort();
    setStorageKeys(keys);
  }, [debugOpen, habit]);

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

  const handleMemoMouseDown = (memo: Memo, event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const offsetX = event.clientX - memo.x;
    const offsetY = event.clientY - memo.y;
    setDragState({ memoId: memo.id, offsetX, offsetY });
  };

  const handleRootContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const targetElement = event.target as HTMLElement;
    const memoElement = targetElement.closest('[data-memo-id]') as HTMLElement | null;
    const memoId = memoElement?.dataset.memoId;
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: memoId ? 'memo' : 'canvas',
      memoId: memoId || undefined,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const x = event.clientX - dragState.offsetX;
      const y = event.clientY - dragState.offsetY;
      setMemos(prev => {
        const next = prev.map(memo =>
          memo.id === dragState.memoId ? { ...memo, x, y } : memo
        );
        if (habit) {
          persistMemosToStorage(habit.id, next);
        }
        return next;
      });
    };

    const handleMouseUp = () => {
      let updated: Memo | null = null;
      setMemos(prev => {
        const next = prev.map(memo => {
          if (memo.id !== dragState.memoId) return memo;
          updated = memo;
          return memo;
        });
        if (habit) {
          persistMemosToStorage(habit.id, next);
        }
        return next;
      });
      if (user && habit && updated) {
        void upsertUserTimerMemo(user, habit.id, updated.id, updated).catch((error) => {
          console.error('Failed to persist timer memo position to Supabase', error);
        });
      }
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, user, habit]);

  const createMemo = (type: MemoType) => {
    if (!contextMenu) return;
    const newMemo: Memo = {
      id: createId(),
      x: contextMenu.x,
      y: contextMenu.y,
      type,
      text: '',
      items: type === 'todo' ? [{ id: createId(), text: '', done: false }] : [],
    };
    setMemos(prev => {
      const next = [...prev, newMemo];
      if (habit) {
        persistMemosToStorage(habit.id, next);
      }
      return next;
    });
    if (user && habit) {
      void upsertUserTimerMemo(user, habit.id, newMemo.id, newMemo).catch((error) => {
        console.error('Failed to persist timer memo to Supabase', error);
      });
    }
    setContextMenu(null);
  };

  const deleteMemo = (memoId: string) => {
    setMemos(prev => {
      const next = prev.filter(memo => memo.id !== memoId);
      if (habit) {
        persistMemosToStorage(habit.id, next);
      }
      return next;
    });
    if (user && habit) {
      void deleteUserTimerMemo(user, habit.id, memoId).catch((error) => {
        console.error('Failed to delete timer memo from Supabase', error);
      });
    }
    setContextMenu(null);
  };

  const updateMemoText = (memoId: string, text: string) => {
    let updated: Memo | null = null;
    setMemos(prev => {
      const next = prev.map(memo => {
        if (memo.id !== memoId) return memo;
        const value = { ...memo, text };
        updated = value;
        return value;
      });
      if (habit) {
        persistMemosToStorage(habit.id, next);
      }
      return next;
    });
    if (user && habit && updated) {
      void upsertUserTimerMemo(user, habit.id, memoId, updated).catch((error) => {
        console.error('Failed to persist timer memo update to Supabase', error);
      });
    }
  };

  const updateTodoText = (memoId: string, itemId: string, text: string) => {
    let updated: Memo | null = null;
    setMemos(prev => {
      const next = prev.map(memo => {
        if (memo.id !== memoId) return memo;
        const value: Memo = {
          ...memo,
          items: memo.items.map(item =>
            item.id === itemId ? { ...item, text } : item
          ),
        };
        updated = value;
        return value;
      });
      if (habit) {
        persistMemosToStorage(habit.id, next);
      }
      return next;
    });
    if (user && habit && updated) {
      void upsertUserTimerMemo(user, habit.id, memoId, updated).catch((error) => {
        console.error('Failed to persist timer memo update to Supabase', error);
      });
    }
  };

  const toggleTodoItem = (memoId: string, itemId: string) => {
    let updated: Memo | null = null;
    setMemos(prev => {
      const next = prev.map(memo => {
        if (memo.id !== memoId) return memo;
        const value: Memo = {
          ...memo,
          items: memo.items.map(item =>
            item.id === itemId ? { ...item, done: !item.done } : item
          ),
        };
        updated = value;
        return value;
      });
      if (habit) {
        persistMemosToStorage(habit.id, next);
      }
      return next;
    });
    if (user && habit && updated) {
      void upsertUserTimerMemo(user, habit.id, memoId, updated).catch((error) => {
        console.error('Failed to persist timer memo update to Supabase', error);
      });
    }
  };

  const addTodoItem = (memoId: string) => {
    let updated: Memo | null = null;
    const newItem: MemoTodoItem = { id: createId(), text: '', done: false };
    setMemos(prev => {
      const next = prev.map(memo => {
        if (memo.id !== memoId) return memo;
        const value: Memo = {
          ...memo,
          items: [...memo.items, newItem],
        };
        updated = value;
        return value;
      });
      if (habit) {
        persistMemosToStorage(habit.id, next);
      }
      return next;
    });
    if (user && habit && updated) {
      void upsertUserTimerMemo(user, habit.id, memoId, updated).catch((error) => {
        console.error('Failed to persist timer memo update to Supabase', error);
      });
    }
  };

  if (!isOpen || !habit) return null;

  const durationMinutes = habit.recommendedDuration || 30;
  const totalSeconds = durationMinutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#E0F7FA] flex flex-col items-center justify-between py-8 px-6 animate-in fade-in duration-200"
      onContextMenu={handleRootContextMenu}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        <div className="flex items-center gap-2">
           {/* Icon could go here */}
           <span className="font-semibold text-lg text-slate-800">{habit.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDebugOpen(prev => !prev)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Debug
          </button>
          <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <MoreHorizontal className="w-6 h-6 text-slate-800" />
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-center mt-10">
        <svg width="320" height="320" className="transform -rotate-90">
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="white"
            strokeWidth="24"
            fill="none"
          />
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
        <div 
            className="absolute w-6 h-6 bg-[#4DB6AC] rounded-full shadow-md transition-all duration-1000 ease-linear z-10"
            style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${progress * 3.6}deg) translateY(-${radius}px)`
            }}
        />
      </div>

      <div className="w-full flex items-center justify-between px-8 mb-10">
        <div className="w-12" />
        
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
      {memos.map(memo => (
        <div
          key={memo.id}
          data-memo-id={memo.id}
          className="fixed z-50"
          style={{
            top: memo.y,
            left: memo.x,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-64 max-w-[80vw] space-y-2">
            <div
              className="flex items-center justify-between cursor-move"
              onMouseDown={event => handleMemoMouseDown(memo, event)}
            >
              <span className="text-xs font-semibold text-slate-600">
                {memo.type === 'text' ? 'Memo' : 'To-do'}
              </span>
              <button
                type="button"
                className="p-1 rounded-full hover:bg-slate-100"
                onClick={() => deleteMemo(memo.id)}
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            {memo.type === 'text' && (
              <textarea
                className="w-full h-24 text-sm border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
                placeholder="Write a note..."
                value={memo.text}
                onChange={event => updateMemoText(memo.id, event.target.value)}
              />
            )}
            {memo.type === 'todo' && (
              <div className="space-y-2">
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {memo.items.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleTodoItem(memo.id, item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <input
                        className="flex-1 border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                        placeholder="To-do item"
                        value={item.text}
                        onChange={event =>
                          updateTodoText(memo.id, item.id, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="w-full text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                  onClick={() => addTodoItem(memo.id)}
                >
                  Add item
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute bg-white rounded-xl shadow-lg border border-slate-200 p-2 w-44 space-y-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={event => event.stopPropagation()}
          >
            {contextMenu.target === 'canvas' && (
              <>
                <button
                  type="button"
                  className="w-full text-sm font-medium px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-800 text-left"
                  onClick={() => createMemo('text')}
                >
                  Create memo
                </button>
                <button
                  type="button"
                  className="w-full text-sm font-medium px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-800 text-left"
                  onClick={() => createMemo('todo')}
                >
                  Create to-do memo
                </button>
              </>
            )}
            {contextMenu.target === 'memo' && contextMenu.memoId && (
              <button
                type="button"
                className="w-full text-sm font-medium px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-800 text-left"
                onClick={() => deleteMemo(contextMenu.memoId!)}
              >
                Delete memo
              </button>
            )}
          </div>
        </div>
      )}
      {debugOpen && (
        <div className="fixed bottom-4 left-4 z-[60] w-[320px] max-w-[90vw] rounded-xl border border-slate-200 bg-white/95 shadow-lg p-3 text-xs text-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-800">Memo Debug</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={recenterMemos}
                className="text-slate-600 hover:text-slate-900"
              >
                Recenter
              </button>
              <button
                type="button"
                onClick={() => setDebugOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <div>habitId: {habit.id}</div>
            <div>habitTitle: {habit.title}</div>
            <div>userId: {user?.id ?? 'none'}</div>
            <div>storageKey: {getStorageKey(habit.id)}</div>
            <div>storageBytes: {storageBytes ?? 'none'}</div>
            <div>storageKeys: {storageKeys.length > 0 ? storageKeys.join(', ') : 'none'}</div>
            <div>memos: {memos.length}</div>
            <div>lastLoadSource: {lastLoadSource ?? 'none'}</div>
            <div>lastPersistAt: {lastPersistAt ? new Date(lastPersistAt).toLocaleTimeString() : 'none'}</div>
            <div>lastRemoteStatus: {lastRemoteStatus ?? 'none'}</div>
            <div>lastRemoteAt: {lastRemoteAt ? new Date(lastRemoteAt).toLocaleTimeString() : 'none'}</div>
            <div>localUpdatedAt: {localUpdatedAt ? new Date(localUpdatedAt).toLocaleTimeString() : 'none'}</div>
            <div>remoteUpdatedAt: {remoteUpdatedAt ? new Date(remoteUpdatedAt).toLocaleTimeString() : 'none'}</div>
            <div>lastError: {lastError ?? 'none'}</div>
          </div>
          {memos.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto space-y-1 text-[10px] text-slate-500">
              {memos.map((memo, index) => (
                <div key={memo.id}>
                  {index + 1}. {memo.type} x:{Math.round(memo.x)} y:{Math.round(memo.y)} text:{memo.text.length} items:{memo.items.length}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
