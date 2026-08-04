import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, STORES } from '../data/stores';
import type { Dish, Store } from '../types';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useProfile } from '../context/ProfileContext';
import { useMealPrefs } from '../context/MealPrefsContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, getPeriod, greeting, isDishExcluded } from '../utils/format';
import StoreCard from '../components/StoreCard';

// 首页：搜索、时段推荐、分类、猜你喜欢、附近好店

/** 根据时段推荐品类 */
function periodCategories(period: string): string[] {
  switch (period) {
    case '早餐':
      return ['美食', '甜品'];
    case '午餐':
      return ['美食', '汉堡', '轻食'];
    case '下午茶':
      return ['奶茶', '甜品'];
    case '晚餐':
      return ['美食', '汉堡', '轻食', '奶茶'];
    default:
      return ['夜宵'];
  }
}

/** 时段推荐：从匹配品类店铺中挑选招牌菜 */
function buildPeriodDishes(period: string): { dish: Dish; store: Store }[] {
  const cats = periodCategories(period);
  const result: { dish: Dish; store: Store }[] = [];
  const usedStores = new Set<string>();
  for (const store of STORES) {
    if (!cats.includes(store.category)) continue;
    const pick = store.dishes.find((d) => d.tags.includes('招牌')) ?? store.dishes[0];
    if (pick && !pick.soldOut) {
      result.push({ dish: pick, store });
      usedStores.add(store.id);
    }
  }
  // 品类匹配不足 4 个时，用评分最高的其他店铺招牌菜补足
  if (result.length < 4) {
    const topup = STORES.filter((s) => !usedStores.has(s.id))
      .sort((a, b) => b.rating - a.rating)
      .flatMap((s) => {
        const pick = s.dishes.find((d) => d.tags.includes('招牌')) ?? s.dishes[0];
        return pick && !pick.soldOut ? [{ dish: pick, store: s }] : [];
      });
    for (const item of topup) {
      if (result.length >= 4) break;
      result.push(item);
    }
  }
  return result;
}

export default function Home() {
  const navigate = useNavigate();
  const { add } = useCart();
  const { orders } = useOrders();
  const { favorites, blocked } = useProfile();
  const { excludes, toggle } = useMealPrefs();
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [sort, setSort] = useState<'综合' | '评分' | '销量' | '配送最快'>('综合');

  const period = getPeriod();
  const periodDishes = useMemo(
    () =>
      buildPeriodDishes(period).filter(
        ({ dish, store }) => !blocked.includes(store.id) && !isDishExcluded(dish, excludes),
      ),
    [period, blocked, excludes],
  );

  /** 猜你喜欢：历史订单品类加权 + 收藏优先，无历史按评分 */
  const guessStores = useMemo(() => {
    const weight = new Map<string, number>();
    for (const order of orders) {
      const store = STORES.find((s) => s.id === order.storeId);
      if (store) weight.set(store.category, (weight.get(store.category) ?? 0) + 1);
    }
    const scored = STORES.filter((s) => !blocked.includes(s.id)).map((s) => {
      let score = weight.get(s.category) ?? 0;
      if (favorites.includes(s.id)) score += 5;
      return { s, score: score * 100 + s.rating };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 4).map((x) => x.s);
  }, [orders, favorites, blocked]);

  /** 附近好店：关键词 + 分类过滤 + 排序 */
  const storeList = useMemo(() => {
    let list = STORES.filter((s) => {
      if (blocked.includes(s.id)) return false;
      const matchCat = category === '全部' || s.category === category;
      const kw = keyword.trim();
      const matchKw =
        !kw ||
        s.name.includes(kw) ||
        s.tags.some((t) => t.includes(kw)) ||
        s.dishes.some((d) => d.name.includes(kw));
      return matchCat && matchKw;
    });
    if (sort === '评分') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === '销量') list = [...list].sort((a, b) => b.monthlySales - a.monthlySales);
    if (sort === '配送最快') list = [...list].sort((a, b) => a.deliveryTime - b.deliveryTime);
    return list;
  }, [keyword, category, sort, blocked]);

  return (
    <div className="page home-page">
      {/* 顶部问候 + 定位 */}
      <div className="home-hero">
        <div className="home-top-row">
          <div>
            <div className="home-greeting">{greeting()}，{period}好</div>
            <div className="home-location">📍 北京 · 五道口 ▾</div>
          </div>
          <div className="brand-badge">
            <span className="brand-emoji">🍜</span>
            <span className="brand-name">吃了没</span>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索店铺或菜品，比如「炸酱面」"
          />
          {keyword && (
            <button className="search-clear" aria-label="清空搜索" onClick={() => setKeyword('')}>
              ×
            </button>
          )}
        </div>

        {/* 分类金刚区 */}
        <div className="category-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={category === c.key ? 'category-item category-item--active' : 'category-item'}
              onClick={() => setCategory(c.key)}
            >
              <span className="category-emoji">{c.emoji}</span>
              <span className="category-name">{c.key}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="home-body">
        {/* 这一顿不想吃什么（快捷移除） */}
        {excludes.length > 0 && (
          <div className="home-excludes">
            <span className="home-excludes-label">这一顿不吃</span>
            {excludes.map((k) => (
              <span className="meal-bar-chip" key={k}>
                {k}
                <button aria-label={`移除${k}`} onClick={() => toggle(k)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 现在适合吃 */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">现在适合吃</h2>
            <span className="section-sub">{period}时段 · 为你推荐</span>
          </div>
          <div className="h-scroll">
            {periodDishes.map(({ dish, store }) => (
              <div
                className="period-card"
                key={dish.id}
                onClick={() => navigate(`/store/${store.id}`)}
              >
                <div className="period-card-emoji">{dish.emoji}</div>
                <div className="period-card-name">{dish.name}</div>
                <div className="period-card-store">{store.name}</div>
                <div className="period-card-bottom">
                  <span className="period-card-price">¥{formatPrice(dish.price)}</span>
                  <button
                    className="add-btn add-btn--small"
                    aria-label="加入购物车"
                    onClick={(e) => {
                      e.stopPropagation();
                      add(store.id, dish.id);
                      showToast('已加入购物车');
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 猜你喜欢 */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">猜你喜欢</h2>
            <span className="section-sub">根据你的口味推荐</span>
          </div>
          <div className="h-scroll">
            {guessStores.map((store) => (
              <div className="guess-card" key={store.id} onClick={() => navigate(`/store/${store.id}`)}>
                <div className="guess-card-logo" style={{ background: store.banner }}>
                  {store.emoji}
                </div>
                <div className="guess-card-name">{store.name}</div>
                <div className="guess-card-meta">★ {store.rating} · {store.deliveryTime} 分钟</div>
              </div>
            ))}
          </div>
        </section>

        {/* 附近好店 */}
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">附近好店</h2>
            <span className="section-sub">无广告 · 干净推荐</span>
          </div>
          <div className="sort-row">
            {(['综合', '评分', '销量', '配送最快'] as const).map((s) => (
              <button
                key={s}
                className={sort === s ? 'sort-btn sort-btn--active' : 'sort-btn'}
                onClick={() => setSort(s)}
              >
                {s}
              </button>
            ))}
          </div>
          {storeList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-emoji">🍽️</div>
              <p>没有找到相关店铺，换个关键词试试～</p>
            </div>
          ) : (
            <div className="store-list">
              {storeList.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
