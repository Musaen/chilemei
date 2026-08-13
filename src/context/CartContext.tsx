import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartItem, CartState, Dish, Store } from '../types';
import { dishUnitPrice, specTextOf } from '../utils/format';

// 购物车：按店铺分组；同一道菜的不同规格（如 大杯/少冰）拆成独立条目，持久化到 localStorage

const STORAGE_KEY = 'clm_cart';

/** 购物车条目详情（含规格文案与单价） */
export interface CartItemDetail {
  dish: Dish;
  qty: number;
  specKey?: string;
  specText: string;
  unitPrice: number;
}

/** 生成购物车条目键：dishId|specKey，用于唯一标识一条规格组合 */
export function itemKey(dishId: string, specKey?: string): string {
  return `${dishId}|${specKey ?? ''}`;
}

interface CartCtx {
  cart: CartState;
  add: (storeId: string, dishId: string, specKey?: string) => void;
  setQty: (storeId: string, key: string, qty: number) => void;
  clearStore: (storeId: string) => void;
  clearAll: () => void;
  /** 计算某个店铺的购物车明细 */
  getStoreCart: (store: Store) => { items: CartItemDetail[]; count: number; subtotal: number };
  /** 全部店铺的购物车条目数 */
  totalCount: number;
  /** 有购物车内容的店铺 id 列表 */
  storeIds: string[];
}

const CartContext = createContext<CartCtx | null>(null);

function loadCart(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartState) : {};
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(loadCart);

  // 购物车变化时写入本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const add = (storeId: string, dishId: string, specKey?: string) => {
    setCart((prev) => {
      const list = prev[storeId] ?? [];
      const found = list.find((i) => itemKey(i.dishId, i.specKey) === itemKey(dishId, specKey));
      const next =
        found
          ? list.map((i) => (itemKey(i.dishId, i.specKey) === itemKey(dishId, specKey) ? { ...i, qty: i.qty + 1 } : i))
          : [...list, { dishId, specKey, qty: 1 }];
      return { ...prev, [storeId]: next };
    });
  };

  const setQty = (storeId: string, key: string, qty: number) => {
    setCart((prev) => {
      const list = prev[storeId] ?? [];
      if (qty <= 0) {
        const next = list.filter((i) => itemKey(i.dishId, i.specKey) !== key);
        return next.length ? { ...prev, [storeId]: next } : omit(prev, storeId);
      }
      return { ...prev, [storeId]: list.map((i) => (itemKey(i.dishId, i.specKey) === key ? { ...i, qty } : i)) };
    });
  };

  const clearStore = (storeId: string) => {
    setCart((prev) => omit(prev, storeId));
  };

  const clearAll = () => setCart({});

  const getStoreCart = (store: Store) => {
    const list = cart[store.id] ?? [];
    const items = list
      .map((ci: CartItem): CartItemDetail | null => {
        const dish = store.dishes.find((d) => d.id === ci.dishId);
        if (!dish) return null;
        return {
          dish,
          qty: ci.qty,
          specKey: ci.specKey,
          specText: specTextOf(dish, ci.specKey),
          unitPrice: dishUnitPrice(dish, ci.specKey),
        };
      })
      .filter((x): x is CartItemDetail => x !== null);
    const count = items.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    return { items, count, subtotal };
  };

  const totalCount = Object.values(cart).reduce((sum, list) => sum + list.reduce((a, i) => a + i.qty, 0), 0);
  const storeIds = Object.keys(cart).filter((id) => (cart[id] ?? []).length > 0);

  return (
    <CartContext.Provider value={{ cart, add, setQty, clearStore, clearAll, getStoreCart, totalCount, storeIds }}>
      {children}
    </CartContext.Provider>
  );
}

/** 删除某个店铺分组（工具函数） */
function omit(obj: CartState, key: string): CartState {
  const next = { ...obj };
  delete next[key];
  return next;
}

/** 使用购物车 */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart 必须在 CartProvider 内使用');
  return ctx;
}
