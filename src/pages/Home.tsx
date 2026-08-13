import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../data/stores';
import type { Dish, Store } from '../types';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useProfile } from '../context/ProfileContext';
import { useMealPrefs } from '../context/MealPrefsContext';
import { useStores } from '../context/StoresContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, getPeriod, greeting, isDishExcluded } from '../utils/format';
import StoreCard from '../components/StoreCard';
import MealExcludeSheet from '../components/MealExcludeSheet';

// 首页：搜索、时段推荐、分类、猜你喜欢、附近好店

/** 热搜词（演示固定榜单） */
const HOT_WORDS = ['炸酱面', '杨枝甘露', '汉堡', '小笼包', '鸡胸肉', '羊肉串'];

const SEARCH_HISTORY_KEY = 'clm_search_history';

/** 读取搜索历史 */
function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

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
function buildPeriodDishes(period: string, stores: Store[]): { dish: Dish; store: Store }[] {
  const cats = periodCategories(period);
  const result: { dish: Dish; store: Store }[] = [];
  const usedStores = new Set<string>();
  for (const store of stores) {
    if (!cats.includes(store.category)) continue;
    const pick = store.dishes.find((d) => d.tags.includes('招牌')) ?? store.dishes[0];
    if (pick && !pick.soldOut) {
      result.push({ dish: pick, store });
      usedStores.add(store.id);
    }
  }
  // 品类匹配不足 4 个时，用评分最高的其他店铺招牌菜补足
  if (result.length < 4) {
    const topup = stores.filter((s) => !usedStores.has(s.id))
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
  const { stores } = useStores();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [sort, setSort] = useState<'综合' | '评分' | '销量' | '配送最快'>('综合');
  const [filters, setFilters] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [showExcludeSheet, setShowExcludeSheet] = useState(false);

  const period = getPeriod();
  const periodDishes = useMemo(
    () =>
      buildPeriodDishes(period, stores).filter(
        ({ dish, store }) => !blocked.includes(store.id) && !isDishExcluded(dish, excludes),
      ),
    [period, stores, blocked, excludes],
  );

  /** 猜你喜欢：历史订单品类加权 + 收藏优先，无历史按评分 */
  const guessStores = useMemo(() => {
    const weight = new Map<string, number>();
    for (const order of orders) {
      const store = stores.find((s) => s.id === order.storeId);
      if (store) weight.set(store.category, (weight.get(store.category) ?? 0) + 1);
    }
    const scored = stores.filter((s) => !blocked.includes(s.id)).map((s) => {
      let score = weight.get(s.category) ?? 0;
      if (favorites.includes(s.id)) score += 5;
      return { s, score: score * 100 + s.rating };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 4).map((x) => x.s);
  }, [orders, favorites, blocked, stores]);

  /** 附近好店：关键词 + 分类过滤 + 排序 */
  const storeList = useMemo(() => {
    let list = stores.filter((s) => {
      if (blocked.includes(s.id)) return false;
      const matchCat = category === '全部' || s.category === category;
      const matchFilters =
        (!filters.includes('免配送费') || s.deliveryFee === 0) &&
        (!filters.includes('有满减') || !!s.promos?.length) &&
        (!filters.includes('评分≥4.5') || s.rating >= 4.5);
      // 忌口过滤：只看未被「这一顿不吃」排除的菜品，全部被排除的店铺不再展示
      const visibleDishes = s.dishes.filter((d) => !isDishExcluded(d, excludes));
      if (visibleDishes.length === 0) return false;
      const kw = keyword.trim();
      const matchKw =
        !kw ||
        s.name.includes(kw) ||
        s.tags.some((t) => t.includes(kw)) ||
        visibleDishes.some((d) => d.name.includes(kw));
      return matchCat && matchKw && matchFilters;
    });
    if (sort === '评分') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === '销量') list = [...list].sort((a, b) => b.monthlySales - a.monthlySales);
    if (sort === '配送最快') list = [...list].sort((a, b) => a.deliveryTime - b.deliveryTime);
    return list;
  }, [keyword, category, sort, filters, blocked, excludes, stores]);

  /** 保存搜索历史（去重、最多 8 条） */
  const saveHistory = (kw: string) => {
    const clean = kw.trim();
    if (!clean) return;
    const next = [clean, ...history.filter((h) => h !== clean)].slice(0, 8);
    setHistory(next);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  };

  /** 提交搜索 */
  const submitSearch = (kw?: string) => {
    const value = kw ?? keyword;
    setKeyword(value);
    saveHistory(value);
    setSearchFocused(false);
  };

  /** 切换筛选条件 */
  const toggleFilter = (f: string) => {
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

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
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch();
            }}
            placeholder="搜索店铺或菜品，比如「炸酱面」"
          />
          {keyword && (
            <button className="search-clear" aria-label="清空搜索" onClick={() => setKeyword('')}>
              ×
            </button>
          )}
        </div>

        {/* 搜索联想：热搜 + 历史 */}
        {searchFocused && (
          <div className="search-suggest">
            {history.length > 0 && (
              <div className="suggest-row">
                <span className="suggest-label">🕘 搜索历史</span>
                <div className="suggest-chips">
                  {history.map((h) => (
                    <button key={h} className="suggest-chip" onMouseDown={() => submitSearch(h)}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="suggest-row">
              <span className="suggest-label">🔥 热搜</span>
              <div className="suggest-chips">
                {HOT_WORDS.map((h) => (
                  <button key={h} className="suggest-chip suggest-chip--hot" onMouseDown={() => submitSearch(h)}>
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
        {/* 这一顿不想吃什么（首页直接设置，与搜索/分类联动） */}
        <div className="home-excludes">
          <span className="home-excludes-label">这一顿不吃</span>
          {excludes.length === 0 ? (
            <button className="home-exclude-empty" onClick={() => setShowExcludeSheet(true)}>
              点我选择，自动过滤菜品 →
            </button>
          ) : (
            <>
              <div className="home-exclude-chips">
                {excludes.map((k) => (
                  <span className="meal-bar-chip" key={k}>
                    {k}
                    <button aria-label={`移除${k}`} onClick={() => toggle(k)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button className="link-btn" onClick={() => setShowExcludeSheet(true)}>
                调整
              </button>
            </>
          )}
        </div>

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
                      if (dish.specs?.length) {
                        showToast('这道菜有规格，进店选择后再加购');
                        navigate(`/store/${store.id}`);
                        return;
                      }
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
          {/* 筛选栏 */}
          <div className="filter-row">
            {(['免配送费', '有满减', '评分≥4.5'] as const).map((f) => (
              <button
                key={f}
                className={filters.includes(f) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                onClick={() => toggleFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {storeList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-emoji">🍽️</div>
              <p>没有找到相关店铺，换个关键词试试～</p>
              {excludes.length > 0 && (
                <button className="link-btn" onClick={() => setShowExcludeSheet(true)}>
                  或调整「这一顿不吃」再试试
                </button>
              )}
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
      {/* 这一顿忌口选择面板（首页直接设置） */}
      <MealExcludeSheet open={showExcludeSheet} onClose={() => setShowExcludeSheet(false)} />
    </div>
  );
}
