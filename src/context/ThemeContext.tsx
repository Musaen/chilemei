import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { THEMES, getTheme } from '../theme';

// 主题色：切换后写入 CSS 变量，全站实时生效，持久化到 localStorage

const STORAGE_KEY = 'clm_theme';

interface ThemeCtx {
  themeKey: string;
  setThemeKey: (key: string) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

function loadThemeKey(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const key = JSON.parse(raw) as string;
      if (THEMES.some((t) => t.key === key)) return key;
    }
  } catch {
    // 忽略读取失败，使用默认主题
  }
  return 'orange';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKey] = useState<string>(loadThemeKey);
  const theme = getTheme(themeKey);

  // 主题变化时更新 CSS 变量和浏览器地址栏主题色
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.colors.primary);
    root.style.setProperty('--primary-dark', theme.colors.primaryDark);
    root.style.setProperty('--primary-light', theme.colors.primaryLight);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.primary);
  }, [theme]);

  // 持久化主题选择
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themeKey));
  }, [themeKey]);

  return <ThemeContext.Provider value={{ themeKey, setThemeKey }}>{children}</ThemeContext.Provider>;
}

/** 使用主题设置 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}
