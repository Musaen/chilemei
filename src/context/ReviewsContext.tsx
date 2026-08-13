import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Review, Store } from '../types';
import { SEED_REVIEWS } from '../data/reviews';
import { makeId } from '../utils/format';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// 评价：种子评价 + 用户评价合并展示；在线模式写入服务端并同步

const STORAGE_KEY = 'clm_reviews';

interface ReviewsCtx {
  reviews: Review[];
  storeReviews: (storeId: string) => Review[];
  /** 店铺聚合评分（种子 + 用户评价的平均值） */
  storeRating: (store: Store) => number;
  reviewedOrderIds: string[];
  addReview: (input: { storeId: string; orderId?: string; rating: number; tags: string[]; text: string }) => Promise<boolean>;
}

const ReviewsContext = createContext<ReviewsCtx | null>(null);

function loadMyReviews(): Review[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const { apiMode, token } = useAuth();
  const [myReviews, setMyReviews] = useState<Review[]>(loadMyReviews);
  const [allReviews, setAllReviews] = useState<Review[]>([]);

  // 在线模式下拉取全部评价（种子 + 所有用户）与我的评价
  useEffect(() => {
    if (!apiMode || !token) return;
    let cancelled = false;
    (async () => {
      const [all, mine] = await Promise.all([
        api.get<{ reviews: Review[] }>('/reviews').catch(() => null),
        api.get<{ reviews: Review[] }>('/reviews/mine', token).catch(() => null),
      ]);
      if (cancelled) return;
      if (all) setAllReviews(all.reviews);
      if (mine) setMyReviews(mine.reviews);
    })();
    return () => {
      cancelled = true;
    };
  }, [apiMode, token]);

  // 我的评价写入本地存储（在线模式仅作为缓存）
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(myReviews));
  }, [myReviews]);

  /** 合并后的全部评价：在线模式以服务端为准，演示模式用种子 + 本地评价 */
  const reviews = useMemo(() => {
    if (apiMode && allReviews.length > 0) return allReviews;
    return [...SEED_REVIEWS, ...myReviews];
  }, [apiMode, allReviews, myReviews]);

  const storeReviews = (storeId: string) =>
    reviews
      .filter((r) => r.storeId === storeId)
      .sort((a, b) => b.createdAt - a.createdAt);

  /** 聚合评分：取该店全部评价（种子 + 我的）的平均分 */
  const storeRating = (store: Store) => {
    const list = reviews.filter((r) => r.storeId === store.id);
    if (list.length === 0) return store.rating;
    const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
    return Math.round(avg * 10) / 10;
  };

  const reviewedOrderIds = myReviews.map((r) => r.orderId ?? '').filter(Boolean);

  const addReview = async (input: {
    storeId: string;
    orderId?: string;
    rating: number;
    tags: string[];
    text: string;
  }): Promise<boolean> => {
    if (apiMode && token) {
      try {
        const data = await api.post<{ review: Review }>('/reviews', input, token);
        setMyReviews((prev) => [...prev.filter((r) => r.orderId !== input.orderId), data.review]);
        return true;
      } catch {
        return false;
      }
    }
    const review: Review = {
      id: makeId('review'),
      storeId: input.storeId,
      orderId: input.orderId,
      rating: input.rating,
      tags: input.tags,
      text: input.text,
      createdAt: Date.now(),
      nickname: '我',
    };
    setMyReviews((prev) => [...prev.filter((r) => r.orderId !== input.orderId), review]);
    return true;
  };

  return (
    <ReviewsContext.Provider value={{ reviews, storeReviews, storeRating, reviewedOrderIds, addReview }}>
      {children}
    </ReviewsContext.Provider>
  );
}

/** 使用评价 */
export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews 必须在 ReviewsProvider 内使用');
  return ctx;
}
