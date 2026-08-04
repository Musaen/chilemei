import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Address } from '../types';
import { DEFAULT_ADDRESSES } from '../data/stores';
import { makeId } from '../utils/format';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// 个人资料：后端可用且已登录时同步到服务端，否则回退本地存储

const PROFILE_KEY = 'clm_profile';
const ADDRESS_KEY = 'clm_addresses';
const FAVORITE_KEY = 'clm_favorites';
const BLOCKED_KEY = 'clm_blocked';

interface ProfileCtx {
  nickname: string;
  setNickname: (name: string) => void;
  addresses: Address[];
  addAddress: (addr: Omit<Address, 'id'>) => void;
  removeAddress: (id: string) => void;
  favorites: string[];
  toggleFavorite: (storeId: string) => void;
  isFavorite: (storeId: string) => boolean;
  blocked: string[];
  blockStore: (storeId: string) => void;
  unblockStore: (storeId: string) => void;
  isBlocked: (storeId: string) => boolean;
}

const ProfileContext = createContext<ProfileCtx | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { apiMode, token, updateNickname } = useAuth();
  const [nickname, setNicknameState] = useState(() => load<string>(PROFILE_KEY, '干饭人小张'));
  const [addresses, setAddresses] = useState<Address[]>(() => load<Address[]>(ADDRESS_KEY, DEFAULT_ADDRESSES));
  const [favorites, setFavorites] = useState<string[]>(() => load<string[]>(FAVORITE_KEY, []));
  const [blocked, setBlocked] = useState<string[]>(() => load<string[]>(BLOCKED_KEY, []));

  // 登录状态变化时从服务端加载地址 / 收藏 / 拉黑
  useEffect(() => {
    if (!apiMode || !token) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all([
        api.get<{ addresses: Address[] }>('/addresses', token),
        api.get<{ ids: string[] }>('/favorites', token),
        api.get<{ ids: string[] }>('/blocked', token),
      ]).catch(() => null);
      if (!results || cancelled) return;
      const [addrData, favData, blockedData] = results;
      setAddresses(addrData.addresses);
      setFavorites(favData.ids);
      setBlocked(blockedData.ids);
      try {
        const me = await api.get<{ user: { nickname: string } }>('/me', token);
        if (!cancelled) setNicknameState(me.user.nickname);
      } catch {
        // 昵称读取失败时保留本地值
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiMode, token]);

  // 数据变化时写入本地存储
  useEffect(() => localStorage.setItem(PROFILE_KEY, JSON.stringify(nickname)), [nickname]);
  useEffect(() => localStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses)), [addresses]);
  useEffect(() => localStorage.setItem(FAVORITE_KEY, JSON.stringify(favorites)), [favorites]);
  useEffect(() => localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked)), [blocked]);

  const setNickname = (name: string) => {
    const next = name.trim() || '干饭人小张';
    setNicknameState(next);
    updateNickname(next);
    // 已登录时同步到服务端（失败静默，下次登录再拉取）
    if (apiMode && token) {
      api.put('/me/nickname', { nickname: next }, token).catch(() => undefined);
    }
  };

  const addAddress = (addr: Omit<Address, 'id'>) => {
    if (apiMode && token) {
      api
        .post<{ address: Address }>('/addresses', addr, token)
        .then((data) => setAddresses((prev) => [...prev, data.address]))
        .catch(() => setAddresses((prev) => [...prev, { ...addr, id: makeId('addr') }]));
      return;
    }
    setAddresses((prev) => [...prev, { ...addr, id: makeId('addr') }]);
  };

  const removeAddress = (id: string) => {
    if (apiMode && token) {
      api.del(`/addresses/${id}`, token).catch(() => undefined);
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleFavorite = (storeId: string) => {
    if (apiMode && token) {
      api
        .post<{ favorite: boolean }>(`/favorites/${storeId}`, {}, token)
        .then((data) =>
          setFavorites((prev) => (data.favorite ? [...prev, storeId] : prev.filter((id) => id !== storeId))),
        )
        .catch(() => undefined);
      return;
    }
    setFavorites((prev) => (prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]));
  };

  const isFavorite = (storeId: string) => favorites.includes(storeId);

  const blockStore = (storeId: string) => {
    if (apiMode && token) {
      api
        .post<{ blocked: boolean }>(`/blocked/${storeId}`, {}, token)
        .then((data) =>
          setBlocked((prev) => (data.blocked ? [...prev, storeId] : prev.filter((id) => id !== storeId))),
        )
        .catch(() => undefined);
      return;
    }
    setBlocked((prev) => (prev.includes(storeId) ? prev : [...prev, storeId]));
  };

  const unblockStore = (storeId: string) => {
    if (apiMode && token) {
      api
        .post<{ blocked: boolean }>(`/blocked/${storeId}`, {}, token)
        .then((data) =>
          setBlocked((prev) => (data.blocked ? [...prev, storeId] : prev.filter((id) => id !== storeId))),
        )
        .catch(() => undefined);
      return;
    }
    setBlocked((prev) => prev.filter((id) => id !== storeId));
  };

  const isBlocked = (storeId: string) => blocked.includes(storeId);

  return (
    <ProfileContext.Provider
      value={{
        nickname,
        setNickname,
        addresses,
        addAddress,
        removeAddress,
        favorites,
        toggleFavorite,
        isFavorite,
        blocked,
        blockStore,
        unblockStore,
        isBlocked,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

/** 使用个人资料 */
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile 必须在 ProfileProvider 内使用');
  return ctx;
}
