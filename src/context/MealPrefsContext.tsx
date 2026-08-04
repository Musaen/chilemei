import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// 「这一顿不想吃什么」：每次点餐时的忌口选择，持久化到 localStorage

const STORAGE_KEY = 'clm_meal_excludes';

interface MealPrefsCtx {
  excludes: string[];
  toggle: (key: string) => void;
  clear: () => void;
}

const MealPrefsContext = createContext<MealPrefsCtx | null>(null);

function loadExcludes(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function MealPrefsProvider({ children }: { children: ReactNode }) {
  const [excludes, setExcludes] = useState<string[]>(loadExcludes);

  // 忌口变化时写入本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(excludes));
  }, [excludes]);

  const toggle = (key: string) => {
    setExcludes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const clear = () => setExcludes([]);

  return <MealPrefsContext.Provider value={{ excludes, toggle, clear }}>{children}</MealPrefsContext.Provider>;
}

/** 使用这一顿忌口设置 */
export function useMealPrefs() {
  const ctx = useContext(MealPrefsContext);
  if (!ctx) throw new Error('useMealPrefs 必须在 MealPrefsProvider 内使用');
  return ctx;
}
