import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, getToken, isApiAvailable, setToken } from '../api/client';

// 登录状态：API 可用性探测 + 手机号验证码登录（演示码 123456）

export interface User {
  id: number;
  phone: string;
  nickname: string;
}

interface AuthCtx {
  apiMode: boolean; // 后端是否可用
  user: User | null;
  token: string | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  updateNickname: (nickname: string) => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiMode, setApiMode] = useState(false);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(null);

  // 启动时探测后端；若已登录则拉取用户信息
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await isApiAvailable();
      if (cancelled) return;
      setApiMode(ok);
      const saved = getToken();
      if (ok && saved) {
        try {
          const data = await api.get<{ user: User }>('/me', saved);
          if (!cancelled) setUser(data.user);
        } catch {
          // 令牌失效则清除
          setToken(null);
          if (!cancelled) setTokenState(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (phone: string, code: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { phone, code });
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  };

  const updateNickname = (nickname: string) => {
    setUser((prev) => (prev ? { ...prev, nickname } : prev));
  };

  return (
    <AuthContext.Provider value={{ apiMode, user, token, login, logout, updateNickname }}>
      {children}
    </AuthContext.Provider>
  );
}

/** 使用登录状态 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
