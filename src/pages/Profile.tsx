import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoreById } from '../data/stores';
import { useProfile } from '../context/ProfileContext';
import { useOrders } from '../context/OrdersContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { THEMES, getTheme } from '../theme';
import { TIMELINE } from '../utils/format';

// 我的：昵称、菜单入口、收藏店铺

export default function Profile() {
  const navigate = useNavigate();
  const { nickname, setNickname, favorites, toggleFavorite, blocked } = useProfile();
  const { orders } = useOrders();
  const { showToast } = useToast();
  const { themeKey, setThemeKey } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname);

  const favStores = favorites.map((id) => getStoreById(id)).filter((s) => s !== undefined);
  const doneCount = orders.filter((o) => {
    const elapsed = (Date.now() - o.placedAt) / 1000;
    return elapsed >= TIMELINE.delivered;
  }).length;

  const saveNickname = () => {
    setNickname(draft);
    setEditing(false);
    showToast('昵称已保存');
  };

  return (
    <div className="page profile-page">
      <div className="page-head">
        <h1>我的</h1>
      </div>

      {/* 个人信息卡 */}
      <div className="profile-card">
        <div className="profile-avatar">🍚</div>
        <div className="profile-info">
          {editing ? (
            <div className="nickname-edit">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={12} autoFocus />
              <button className="link-btn" onClick={saveNickname}>
                保存
              </button>
            </div>
          ) : (
            <div className="profile-name" onClick={() => {
              setDraft(nickname);
              setEditing(true);
            }}>
              {nickname} ✏️
            </div>
          )}
          <div className="profile-phone">138****8888 · 北京</div>
        </div>
        <div className="profile-stats">
          <div className="profile-stat">
            <b>{orders.length}</b>
            <span>订单</span>
          </div>
          <div className="profile-stat">
            <b>{doneCount}</b>
            <span>已送达</span>
          </div>
          <div className="profile-stat">
            <b>{favorites.length}</b>
            <span>收藏</span>
          </div>
        </div>
      </div>

      {/* 主题色切换 */}
      <div className="theme-section">
        <div className="section-head">
          <h2 className="section-title">主题色</h2>
          <span className="section-sub">点一下试试</span>
        </div>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.key}
              className={themeKey === t.key ? 'theme-item theme-item--active' : 'theme-item'}
              onClick={() => setThemeKey(t.key)}
            >
              <span className="theme-swatch" style={{ background: t.colors.primary }} />
              <span className="theme-name">
                {t.emoji} {t.name}
              </span>
            </button>
          ))}
        </div>
        <div className="theme-desc">{getTheme(themeKey).desc}</div>
      </div>

      {/* 菜单 */}
      <div className="profile-menu">
        <button className="profile-menu-item" onClick={() => navigate('/orders')}>
          <span className="menu-icon">📋</span>
          <span className="menu-label">我的订单</span>
          <span className="menu-arrow">›</span>
        </button>
        <button className="profile-menu-item" onClick={() => navigate('/addresses')}>
          <span className="menu-icon">📍</span>
          <span className="menu-label">收货地址</span>
          <span className="menu-arrow">›</span>
        </button>
        <button className="profile-menu-item" onClick={() => navigate('/blocked')}>
          <span className="menu-icon">🚫</span>
          <span className="menu-label">已拉黑店铺</span>
          {blocked.length > 0 && <span className="menu-count">{blocked.length}</span>}
          <span className="menu-arrow">›</span>
        </button>
        <button className="profile-menu-item" onClick={() => showToast('演示模式：暂无优惠券')}>
          <span className="menu-icon">🎟️</span>
          <span className="menu-label">优惠券</span>
          <span className="menu-arrow">›</span>
        </button>
        <button className="profile-menu-item" onClick={() => showToast('无广告 · 极简 · 配送透明 —— 这就是吃了没')}>
          <span className="menu-icon">💬</span>
          <span className="menu-label">关于吃了没</span>
          <span className="menu-arrow">›</span>
        </button>
      </div>

      {/* 收藏 */}
      <div className="section-head">
        <h2 className="section-title">收藏的店铺</h2>
      </div>
      {favStores.length === 0 ? (
        <div className="empty-state empty-state--small">
          <p>还没有收藏店铺，看到喜欢的点个 ♥ 吧</p>
        </div>
      ) : (
        <div className="fav-list">
          {favStores.map((store) => (
            <div className="fav-item" key={store.id}>
              <button className="fav-store-main" onClick={() => navigate(`/store/${store.id}`)}>
                <span className="fav-logo" style={{ background: store.banner }}>
                  {store.emoji}
                </span>
                <span className="fav-name">
                  {store.name}
                  <span className="fav-meta">
                    ★ {store.rating} · {store.deliveryTime} 分钟
                  </span>
                </span>
              </button>
              <button
                className="fav-toggle"
                aria-label="取消收藏"
                onClick={() => toggleFavorite(store.id)}
              >
                ♥
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
