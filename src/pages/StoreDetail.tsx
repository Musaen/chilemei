import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStoreById } from '../data/stores';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { useMealPrefs } from '../context/MealPrefsContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, isDishExcluded } from '../utils/format';
import Stepper from '../components/Stepper';
import CartBar from '../components/CartBar';
import MealExcludeSheet from '../components/MealExcludeSheet';

// 店铺详情：菜单、加购、底部购物车栏

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useMemo(() => getStoreById(id ?? ''), [id]);
  const { getStoreCart, add, setQty } = useCart();
  const { isFavorite, toggleFavorite, isBlocked, blockStore, unblockStore } = useProfile();
  const { excludes, toggle } = useMealPrefs();
  const { showToast } = useToast();
  const [activeCat, setActiveCat] = useState('');
  const [showSheet, setShowSheet] = useState(false);
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

  const cart = getStoreCart(store);
  const fav = isFavorite(store.id);
  const blocked = isBlocked(store.id);
  const hiddenCount = store.dishes.filter((d) => isDishExcluded(d, excludes)).length;

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

      {/* 店铺信息卡 */}
      <div className="store-info-card">
        <div className="store-info-title">{store.name}</div>
        <div className="store-info-meta">
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

      {/* 分类导航 */}
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

      {/* 菜单分组 */}
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
              const qty = cart.items.find((i) => i.dish.id === dish.id)?.qty ?? 0;
              return (
                <div className={dish.soldOut ? 'dish-card dish-card--soldout' : 'dish-card'} key={dish.id}>
                  <div className="dish-emoji">{dish.emoji}</div>
                  <div className="dish-info">
                    <div className="dish-name">
                      {dish.name}
                      {dish.tags.map((t) => (
                        <span className="dish-tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="dish-desc">{dish.desc}</div>
                    <div className="dish-sales">月售 {dish.sales}{dish.soldOut ? ' · 已售罄' : ''}</div>
                    <div className="dish-bottom">
                      <div className="dish-price">
                        ¥{formatPrice(dish.price)}
                        {dish.originalPrice && (
                          <span className="dish-original">¥{formatPrice(dish.originalPrice)}</span>
                        )}
                      </div>
                      {dish.soldOut ? (
                        <span className="soldout-text">售罄</span>
                      ) : (
                        <Stepper
                          small
                          qty={qty}
                          onAdd={() => add(store.id, dish.id)}
                          onMinus={() => setQty(store.id, dish.id, qty - 1)}
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

      {/* 底部购物车栏 */}
      <CartBar store={store} />
      {/* 忌口选择面板 */}
      <MealExcludeSheet open={showSheet} onClose={() => setShowSheet(false)} />
    </div>
  );
}
