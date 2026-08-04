import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Address } from '../types';
import { DEFAULT_ADDRESSES } from '../data/stores';
import { makeId } from '../utils/format';

// 个人资料：昵称、地址、收藏店铺，持久化到 localStorage

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
  const [nickname, setNicknameState] = useState(() => load<string>(PROFILE_KEY, '干饭人小张'));
  const [addresses, setAddresses] = useState<Address[]>(() => load<Address[]>(ADDRESS_KEY, DEFAULT_ADDRESSES));
  const [favorites, setFavorites] = useState<string[]>(() => load<string[]>(FAVORITE_KEY, []));
  const [blocked, setBlocked] = useState<string[]>(() => load<string[]>(BLOCKED_KEY, []));

  // 数据变化时写入本地存储
  useEffect(() => localStorage.setItem(PROFILE_KEY, JSON.stringify(nickname)), [nickname]);
  useEffect(() => localStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses)), [addresses]);
  useEffect(() => localStorage.setItem(FAVORITE_KEY, JSON.stringify(favorites)), [favorites]);
  useEffect(() => localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked)), [blocked]);

  const setNickname = (name: string) => setNicknameState(name.trim() || '干饭人小张');

  const addAddress = (addr: Omit<Address, 'id'>) => {
    setAddresses((prev) => [...prev, { ...addr, id: makeId('addr') }]);
  };

  const removeAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleFavorite = (storeId: string) => {
    setFavorites((prev) => (prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]));
  };

  const isFavorite = (storeId: string) => favorites.includes(storeId);

  const blockStore = (storeId: string) => {
    setBlocked((prev) => (prev.includes(storeId) ? prev : [...prev, storeId]));
  };

  const unblockStore = (storeId: string) => {
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
