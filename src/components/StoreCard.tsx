import { useNavigate } from 'react-router-dom';
import type { Store } from '../types';
import { useProfile } from '../context/ProfileContext';
import { formatPrice } from '../utils/format';

// 店铺卡片：首页店铺列表使用

export default function StoreCard({ store }: { store: Store }) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useProfile();
  const fav = isFavorite(store.id);

  return (
    <div className="store-card" onClick={() => navigate(`/store/${store.id}`)}>
      {/* 店铺图标区 */}
      <div className="store-logo" style={{ background: store.banner }}>
        <span className="store-logo-emoji">{store.emoji}</span>
        {fav && <span className="store-fav-badge">♥</span>}
      </div>
      {/* 店铺信息区 */}
      <div className="store-info">
        <div className="store-name-row">
          <span className="store-name">{store.name}</span>
          <button
            className="fav-btn"
            aria-label="收藏"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(store.id);
            }}
          >
            {fav ? '♥' : '♡'}
          </button>
        </div>
        <div className="store-meta">
          <span className="store-rating">★ {store.rating}</span>
          <span>月售 {store.monthlySales}</span>
          <span>{store.deliveryTime} 分钟</span>
          <span>{store.distance} km</span>
        </div>
        <div className="store-meta store-meta--sub">
          <span>起送 ¥{formatPrice(store.minOrder)}</span>
          <span>{store.deliveryFee > 0 ? `配送费 ¥${formatPrice(store.deliveryFee)}` : '免配送费'}</span>
        </div>
        <div className="store-tags">
          {store.tags.map((tag) => (
            <span className="store-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
