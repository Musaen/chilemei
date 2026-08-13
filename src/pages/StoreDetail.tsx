import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Dish } from '../types';
import { itemKey, useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { useMealPrefs } from '../context/MealPrefsContext';
import { useToast } from '../context/ToastContext';
import { useStores } from '../context/StoresContext';
import { useReviews } from '../context/ReviewsContext';
import { formatDay, formatPrice, formatTime, isDishExcluded, isStoreOpen } from '../utils/format';
import Stepper from '../components/Stepper';
import CartBar from '../components/CartBar';
import MealExcludeSheet from '../components/MealExcludeSheet';
import SpecSheet from '../components/SpecSheet';

// 店铺详情：菜单、加购、底部购物车栏

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getStoreById } = useStores();
  const store = useMemo(() => getStoreById(id ?? ''), [id, getStoreById]);
  const { getStoreCart, add, setQty } = useCart();
  const { isFavorite, toggleFavorite, isBlocked, blockStore, unblockStore } = useProfile();
  const { excludes, toggle } = useMealPrefs();
  const { showToast } = useToast();
  const { storeReviews, storeRating } = useReviews();
  const [activeCat, setActiveCat] = useState('');
  const [showSheet, setShowSheet] = useState(false);
  const [specDish, setSpecDish] = useState<Dish | null>(null);
  const [tab, setTab] = useState<'menu' | 'reviews'>('menu');
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 按分类分组菜品
  const categories = useMemo(() => {
    if (!store) return [];
    const map = new Map<string, typeof store.dishes>();
    for (const dish of store.dishes) {
      const key = dish.tags.includes('招牌') ? '招牌' : '全部';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(dish);
    }
    return Array.from(map.entries()).map(([name, dishes]) => ({ name, dishes }));
  }, [store]);

  // 店铺不存在时返回首页
  if (!store) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">🤔</div>
        <p>店铺不存在或已打烊</p>
        <button className="primary-btn" onClick={() => navigate('/')}>
          回首页
        </button>
      </div>
    );
  }

  const open = isStoreOpen(store);
  const reviews = storeReviews(store.id);
  const aggRating = storeRating(store);
  const cart = getStoreCart(store);
  const fav = isFavorite(store.id);
  const blocked = isBlocked(store.id);
  const hiddenCount = store.dishes.filter((d) => isDishExcluded(d, excludes)).length;

  /** 某道菜（可能多规格）在购物车中的总份数 */
  const qtyOf = (dish: Dish) => cart.items.filter((i) => i.dish.id === dish.id).reduce((s, i) => s + i.qty, 0);
  /** 某道菜已选中的规格明细 */
  const variantsOf = (dish: Dish) => cart.items.filter((i) => i.dish.id === dish.id);

  /** 规格确认：按所选数量加入购物车 */
  const confirmSpec = (dish: Dish, specKey: string, qty: number) => {
    for (let i = 0; i < qty; i++) add(store.id, dish.id, specKey);
    setSpecDish(null);
    showToast('已加入购物车');
  };

  /** 点击分类时滚动到对应分组 */
  const scrollTo = (cat: string) => {
    setActiveCat(cat);
    groupRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="store-detail-page">
      {/* 顶部渐变横幅 */}
      <div className="store-banner" style={{ background: store.banner }}>
        <button className="banner-back" aria-label="返回" onClick={() => navigate(-1)}>
          ‹
        </button>
        <div className="store-banner-content">
          <div className="store-banner-emoji">{store.emoji}</div>
          <div className="store-banner-name">{store.name}</div>
        </div>
        <button className="banner-fav" aria-label="收藏" onClick={() => toggleFavorite(store.id)}>
          {fav ? '♥' : '♡'}
        </button>
      </div>

      {/* 打烊提示 */}
      {!open && (
        <div className="closed-banner">🕐 休息中 · 营业时间 {store.openHours}，休息时段暂不能下单</div>
      )}

      {/* 店铺信息卡 */}
      <div className="store-info-card">
        <div className="store-info-title">{store.name}</div>
        <div className="store-info-meta">
          <span className={open ? 'open-badge open-badge--on' : 'open-badge'}>
            {open ? '营业中' : '休息中'}
          </span>
          <span className="rating-text">★ {store.rating}</span>
          <span>月售 {store.monthlySales}</span>
          <span>{store.deliveryTime} 分钟</span>
          <span>{store.distance} km</span>
        </div>
        <div className="store-info-meta store-info-meta--sub">
          <span>起送 ¥{formatPrice(store.minOrder)}</span>
          <span>{store.deliveryFee > 0 ? `配送费 ¥${formatPrice(store.deliveryFee)}` : '免配送费'}</span>
          {store.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="store-notice">📢 {store.notice}</div>
        {/* 满减活动 */}
        {store.promos && store.promos.length > 0 && (
          <div className="promo-row">
            {store.promos.map((p) => (
              <span className="promo-chip" key={p.label}>
                ¥{p.discount} · {p.label}
              </span>
            ))}
          </div>
        )}
        {/* 商家信息 */}
        <div className="store-info-extra">
          <div className="store-info-line">🕐 营业时间 {store.openHours}</div>
          <div className="store-info-line">📍 商家地址 {store.address}</div>
          <div className="store-info-line">📜 资质 {store.license}</div>
        </div>
        {/* 收藏 / 拉黑操作 */}
        <div className="store-actions">
          <button
            className={fav ? 'store-action store-action--active' : 'store-action'}
            onClick={() => {
              toggleFavorite(store.id);
              showToast(fav ? '已取消收藏' : '已收藏');
            }}
          >
            {fav ? '♥' : '♡'} {fav ? '已收藏' : '收藏'}
          </button>
          <button
            className={blocked ? 'store-action store-action--danger' : 'store-action'}
            onClick={() => {
              if (blocked) {
                unblockStore(store.id);
                showToast('已取消拉黑');
              } else {
                blockStore(store.id);
                showToast('已拉黑这家店，首页不再推荐');
              }
            }}
          >
            {blocked ? '✓ 已拉黑' : '🚫 拉黑这家店'}
          </button>
        </div>
        {blocked && (
          <div className="blocked-notice">
            你已拉黑这家店，首页将不再推荐。想恢复可到「我的 → 已拉黑店铺」。
          </div>
        )}
      </div>

      {/* 这一顿不想吃什么 */}
      <div className="meal-bar">
        <span className="meal-bar-label">这一顿不吃</span>
        {excludes.length === 0 ? (
          <button className="meal-bar-empty" onClick={() => setShowSheet(true)}>
            还没有选择，点我设置 →
          </button>
        ) : (
          <>
            <div className="meal-bar-chips">
              {excludes.map((k) => (
                <span className="meal-bar-chip" key={k}>
                  {k}
                  <button aria-label={`移除${k}`} onClick={() => toggle(k)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button className="link-btn" onClick={() => setShowSheet(true)}>
              调整
            </button>
          </>
        )}
      </div>
      {hiddenCount > 0 && (
        <div className="meal-hidden-tip">
          已为你隐藏 {hiddenCount} 道不想吃的菜
          <button className="link-btn" onClick={() => setShowSheet(true)}>
            重新选择
          </button>
        </div>
      )}

      {/* 页面 Tab：菜单 / 评价 */}
      <div className="store-tabs">
        <button className={tab === 'menu' ? 'store-tab store-tab--active' : 'store-tab'} onClick={() => setTab('menu')}>
          菜单
        </button>
        <button
          className={tab === 'reviews' ? 'store-tab store-tab--active' : 'store-tab'}
          onClick={() => setTab('reviews')}
        >
          评价（{reviews.length}）
        </button>
      </div>

      {/* 分类导航 */}
      {tab === 'menu' && (
        <div className="menu-tabs">
          {categories.map((c) => (
            <button
              key={c.name}
              className={activeCat === c.name ? 'menu-tab menu-tab--active' : 'menu-tab'}
              onClick={() => scrollTo(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 菜单分组 */}
      {tab === 'menu' && (
        <div className="menu-groups">
        {categories.map((c) => (
          <div
            className="menu-group"
            key={c.name}
            ref={(el) => {
              groupRefs.current[c.name] = el;
            }}
          >
            <h3 className="menu-group-title">{c.name}</h3>
            {c.dishes.filter((d) => !isDishExcluded(d, excludes)).map((dish) => {
              const hasSpecs = !!dish.specs?.length;
              const qty = qtyOf(dish);
              return (
                <div
                  className={dish.soldOut ? 'dish-card dish-card--soldout' : 'dish-card'}
                  key={dish.id}
                  onClick={() => {
                    if (hasSpecs) setSpecDish(dish);
                  }}
                >
                  <div className="dish-emoji">{dish.emoji}</div>
                  <div className="dish-info">
                    <div className="dish-name">
                      {dish.name}
                      {dish.tags.map((t) => (
                        <span className="dish-tag" key={t}>
                          {t}
                        </span>
                      ))}
                      {hasSpecs && <span className="dish-tag dish-tag--spec">规格可选</span>}
                    </div>
                    <div className="dish-desc">{dish.desc}</div>
                    <div className="dish-sales">月售 {dish.sales}{dish.soldOut ? ' · 已售罄' : ''}</div>
                    {variantsOf(dish).map((v) => (
                      <div className="dish-spec-selected" key={itemKey(v.dish.id, v.specKey)}>
                        {v.specText} ×{v.qty}
                      </div>
                    ))}
                    <div className="dish-bottom">
                      <div className="dish-price">
                        ¥{formatPrice(dish.price)}
                        {dish.originalPrice && (
                          <span className="dish-original">¥{formatPrice(dish.originalPrice)}</span>
                        )}
                      </div>
                      {dish.soldOut ? (
                        <span className="soldout-text">售罄</span>
                      ) : !open ? (
                        <span className="soldout-text">休息中</span>
                      ) : hasSpecs ? (
                        <button
                          className={qty > 0 ? 'spec-added-btn' : 'add-btn add-btn--small'}
                          aria-label="选择规格"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpecDish(dish);
                          }}
                        >
                          {qty > 0 ? `已选 ${qty} 份` : '+'}
                        </button>
                      ) : (
                        <Stepper
                          small
                          qty={qty}
                          onAdd={() => add(store.id, dish.id)}
                          onMinus={() => setQty(store.id, itemKey(dish.id), qty - 1)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {c.dishes.every((d) => isDishExcluded(d, excludes)) && (
              <div className="menu-group-empty">这个分类的菜都被你这一顿排除了～</div>
            )}
          </div>
        ))}
        </div>
      )}

      {/* 评价面板 */}
      {tab === 'reviews' && (
        <div className="reviews-panel">
          {/* 评分总览 */}
          <div className="rating-summary">
            <div className="rating-summary-left">
              <div className="rating-big">{aggRating.toFixed(1)}</div>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={n <= Math.round(aggRating) ? 'review-star review-star--on' : 'review-star'}>
                    ★
                  </span>
                ))}
              </div>
              <div className="rating-count">共 {reviews.length} 条评价</div>
            </div>
            <div className="rating-bars">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = reviews.filter((r) => r.rating === n).length;
                const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div className="rating-bar-row" key={n}>
                    <span className="rating-bar-label">{n} 星</span>
                    <div className="rating-bar-track">
                      <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="rating-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 评价列表 */}
          <div className="review-list">
            {reviews.map((r) => (
              <div className="review-item" key={r.id}>
                <div className="review-item-head">
                  <span className="review-avatar">🍚</span>
                  <div className="review-item-info">
                    <div className="review-nickname">{r.nickname}</div>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={n <= r.rating ? 'review-star review-star--on' : 'review-star'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="review-time">
                    {formatDay(r.createdAt)} {formatTime(r.createdAt)}
                  </span>
                </div>
                {r.tags.length > 0 && (
                  <div className="review-tags">
                    {r.tags.map((t) => (
                      <span className="review-tag review-tag--static" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {r.text && <div className="review-text">{r.text}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部购物车栏 */}
      <CartBar store={store} />
      {/* 忌口选择面板 */}
      <MealExcludeSheet open={showSheet} onClose={() => setShowSheet(false)} />
      {/* 规格选择面板 */}
      <SpecSheet
        dish={specDish}
        onClose={() => setSpecDish(null)}
        onConfirm={(specKey, qty) => {
          if (specDish) confirmSpec(specDish, specKey, qty);
        }}
      />
    </div>
  );
}
