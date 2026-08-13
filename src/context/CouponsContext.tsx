import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Coupon } from '../types';
import { COUPON_TEMPLATES } from '../data/coupons';
import { isCouponUsable } from '../utils/format';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// 优惠券：后端可用且已登录时同步服务端，否则本地存储（领券中心 + 我的优惠券）

const STORAGE_KEY = 'clm_coupons';

interface CouponsCtx {
  coupons: Coupon[]; // 我的优惠券
  claim: (templateId: string) => Promise<boolean>;
  markUsed: (couponId?: string) => void;
  /** 当前小计下可用的优惠券 */
  usableCoupons: (subtotal: number) => Coupon[];
}

const CouponsContext = createContext<CouponsCtx | null>(null);

function loadCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Coupon[]) : [];
  } catch {
    return [];
  }
}

export function CouponsProvider({ children }: { children: ReactNode }) {
  const { apiMode, token } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>(loadCoupons);

  // 登录后从服务端拉取我的优惠券
  useEffect(() => {
    if (!apiMode || !token) return;
    let cancelled = false;
    api
      .get<{ coupons: Coupon[] }>('/coupons/mine', token)
      .then((data) => {
        if (!cancelled) setCoupons(data.coupons);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiMode, token]);

  // 优惠券变化时写入本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
  }, [coupons]);

  /** 领取优惠券（演示模式直接本地生成，有效期按模板天数） */
  const claim = async (templateId: string): Promise<boolean> => {
    if (apiMode && token) {
      try {
        const data = await api.post<{ coupon: Coupon }>(`/coupons/${templateId}/claim`, {}, token);
        setCoupons((prev) => [...prev, data.coupon]);
        return true;
      } catch {
        return false;
      }
    }
    const tpl = COUPON_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl || coupons.some((c) => c.id === templateId && !c.usedAt)) return false;
    const coupon: Coupon = {
      id: tpl.id,
      title: tpl.title,
      threshold: tpl.threshold,
      amount: tpl.amount,
      expiresAt: Date.now() + tpl.validDays * 86400000,
      claimedAt: Date.now(),
    };
    setCoupons((prev) => [...prev, coupon]);
    return true;
  };

  /** 订单创建成功后标记优惠券已使用（在线模式由服务端标记，重新拉取同步） */
  const markUsed = (couponId?: string) => {
    if (!couponId) return;
    setCoupons((prev) => prev.map((c) => (c.id === couponId ? { ...c, usedAt: Date.now() } : c)));
    if (apiMode && token) {
      api
        .get<{ coupons: Coupon[] }>('/coupons/mine', token)
        .then((data) => setCoupons(data.coupons))
        .catch(() => undefined);
    }
  };

  const usableCoupons = (subtotal: number) =>
    coupons.filter((c) => isCouponUsable(c, subtotal)).sort((a, b) => b.amount - a.amount);

  return (
    <CouponsContext.Provider value={{ coupons, claim, markUsed, usableCoupons }}>
      {children}
    </CouponsContext.Provider>
  );
}

/** 使用优惠券 */
export function useCoupons() {
  const ctx = useContext(CouponsContext);
  if (!ctx) throw new Error('useCoupons 必须在 CouponsProvider 内使用');
  return ctx;
}
