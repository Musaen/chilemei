import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Store } from '../types';
import { STORES } from '../data/stores';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// 店铺数据：后端可用时从 API 拉取，失败或不可用时回退到内置演示数据

interface StoresCtx {
  stores: Store[];
  getStoreById: (id: string) => Store | undefined;
}

const StoresContext = createContext<StoresCtx | null>(null);

export function StoresProvider({ children }: { children: ReactNode }) {
  const { apiMode } = useAuth();
  const [stores, setStores] = useState<Store[]>(STORES);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    api
      .get<{ stores: Store[] }>('/stores')
      .then((data) => {
        if (!cancelled) setStores(data.stores);
      })
      .catch(() => {
        // API 异常时保持演示数据
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  const getStoreById = (id: string) => stores.find((s) => s.id === id);

  return <StoresContext.Provider value={{ stores, getStoreById }}>{children}</StoresContext.Provider>;
}

/** 使用店铺数据 */
export function useStores() {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error('useStores 必须在 StoresProvider 内使用');
  return ctx;
}
