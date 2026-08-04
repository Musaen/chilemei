import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// 「这一顿不想吃什么」：本地即时生效；已登录时同步到服务端（跟随账号）

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
  const { apiMode, token } = useAuth();
  const [excludes, setExcludes] = useState<string[]>(loadExcludes);

  // 登录后从服务端拉取忌口偏好
  useEffect(() => {
    if (!apiMode || !token) return;
    let cancelled = false;
    api
      .get<{ excludes: string[] }>('/excludes', token)
      .then((data) => {
        if (!cancelled) setExcludes(data.excludes);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiMode, token]);

  // 忌口变化时写入本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(excludes));
  }, [excludes]);

  const toggle = (key: string) => {
    const next = excludes.includes(key) ? excludes.filter((k) => k !== key) : [...excludes, key];
    setExcludes(next);
    // 已登录时同步到服务端（失败静默）
    if (apiMode && token) {
      api.put('/excludes', { excludes: next }, token).catch(() => undefined);
    }
  };

  const clear = () => {
    setExcludes([]);
    if (apiMode && token) {
      api.put('/excludes', { excludes: [] }, token).catch(() => undefined);
    }
  };

  return <MealPrefsContext.Provider value={{ excludes, toggle, clear }}>{children}</MealPrefsContext.Provider>;
}

/** 使用这一顿忌口设置 */
export function useMealPrefs() {
  const ctx = useContext(MealPrefsContext);
  if (!ctx) throw new Error('useMealPrefs 必须在 MealPrefsProvider 内使用');
  return ctx;
}
