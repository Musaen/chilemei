import { NavLink, useLocation } from 'react-router-dom';

// 底部标签栏：首页 / 订单 / 我的

const TABS = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/orders', label: '订单', icon: '📋' },
  { to: '/profile', label: '我的', icon: '🙋' },
];

export default function TabBar() {
  const location = useLocation();
  // 只在主 Tab 页面显示
  const show = TABS.some((t) => t.to === location.pathname);
  if (!show) return null;
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => (isActive ? 'tab-item tab-item--active' : 'tab-item')}
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
