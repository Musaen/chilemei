import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders } from '../context/OrdersContext';
import { useCart } from '../context/CartContext';
import { useReviews } from '../context/ReviewsContext';
import { useToast } from '../context/ToastContext';
import {
  CANCEL_WINDOW_SEC,
  canCancelOrder,
  STATUS_TEXT,
  TIMELINE,
  URGE_BOOST_SEC,
  formatPrice,
  formatSeconds,
  formatTime,
  getOrderStatus,
} from '../utils/format';
import StatusTimeline from '../components/StatusTimeline';
import RiderMap from '../components/RiderMap';
import Header from '../components/Header';

// 配送跟踪页：状态时间轴、模拟地图动画、ETA 倒计时、超时必赔

const STATUS_EMOJI: Record<string, string> = {
  paid: '✅',
  preparing: '👨‍🍳',
  picked: '🛵',
  delivering: '🛵',
  delivered: '🎉',
  cancelled: '🚫',
};

export default function Track() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, cancelOrder, urgeOrder } = useOrders();
  const { add } = useCart();
  const { reviewedOrderIds } = useReviews();
  const { showToast } = useToast();
  const order = orderId ? getOrder(orderId) : undefined;
  const reviewed = orderId ? reviewedOrderIds.includes(orderId) : false;

  const [now, setNow] = useState(Date.now());

  // 每秒刷新一次，驱动倒计时和状态推进
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const status = useMemo(() => (order ? getOrderStatus(order, now) : 'paid'), [order, now]);

  if (!order) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">📦</div>
        <p>没有找到该订单</p>
        <button className="primary-btn" onClick={() => navigate('/orders')}>
          去订单列表
        </button>
      </div>
    );
  }

  const elapsedSec = (now - order.placedAt) / 1000;
  const boostSec = (order.urges ?? 0) * URGE_BOOST_SEC;
  const remainSec = Math.max(0, TIMELINE.delivered - elapsedSec - boostSec);
  const done = status === 'delivered';
  const cancelled = status === 'cancelled';
  const canCancel = order ? canCancelOrder(order, now) : false;
  const cancelLeftSec = order ? Math.max(0, CANCEL_WINDOW_SEC - (now - order.placedAt) / 1000) : 0;
  const overTime = !done && elapsedSec > TIMELINE.delivered + 30;
  // 配送阶段进度（骑手动画用）
  const riderProgress = Math.max(
    0,
    Math.min(1, (elapsedSec + boostSec - TIMELINE.delivering) / (TIMELINE.delivered - TIMELINE.delivering)),
  );
  const riderDistance = Math.max(0, (1 - riderProgress) * 1.8);

  /** 再来一单：把上次的菜重新加入购物车 */
  const reorder = () => {
    for (const item of order.items) {
      for (let i = 0; i < item.qty; i++) add(order.storeId, item.dishId, item.specKey);
    }
    showToast('已加入购物车');
    navigate(`/store/${order.storeId}`);
  };

  /** 取消订单 */
  const handleCancel = async () => {
    if (!window.confirm('确定取消这笔订单吗？演示环境会原路退回支付金额。')) return;
    const ok = await cancelOrder(order.id);
    showToast(ok ? '订单已取消，款项已原路退回（演示）' : '取消失败，可能已过可取消时间');
  };

  /** 催单 */
  const handleUrge = async () => {
    const ok = await urgeOrder(order.id);
    showToast(ok ? '已催单，骑手正在加急（演示加速 8 秒）' : '催单失败，请稍后再试');
  };

  return (
    <div className="page track-page">
      <Header title="订单配送" onBack={() => navigate('/orders')} />

      {/* 状态横幅 */}
      <div className={cancelled ? 'track-hero track-hero--cancelled' : done ? 'track-hero track-hero--done' : 'track-hero'}>
        <div className="track-hero-emoji">{STATUS_EMOJI[status]}</div>
        <div className="track-hero-text">
          <h1>{cancelled ? '订单已取消' : done ? '已送达，趁热吃！' : STATUS_TEXT[status]}</h1>
          <p>
            {cancelled
              ? '支付金额已原路退回（演示），欢迎下次再来'
              : done
                ? '骑手已确认送达，记得给个好评哦～'
                : `预计 ${formatTime(order.placedAt + order.deliveryTime * 60000)} 前送达`}
          </p>
        </div>
      </div>

      {/* ETA 倒计时 + 超时必赔 */}
      {!cancelled && <div className="eta-card">
        <div className="eta-left">
          <div className="eta-label">{done ? '本次配送用时' : '预计送达倒计时'}</div>
          <div className="eta-count">{done ? '已送达' : formatSeconds(remainSec)}</div>
          <div className="eta-sub">
            演示加速模式 · 真实预计约 {order.deliveryTime} 分钟
            {(order.urges ?? 0) > 0 && ` · 已催单 ${order.urges} 次`}
          </div>
        </div>
        <div className={overTime ? 'promise-badge promise-badge--overtime' : 'promise-badge'}>
          <div className="promise-title">⏱ 超时必赔</div>
          <div className="promise-text">{overTime ? '已超时，¥10 赔偿已到账（演示）' : '超时立即赔付 ¥10'}</div>
        </div>
      </div>}

      {/* 模拟地图 */}
      {!cancelled && <RiderMap progress={riderProgress} />}

      {/* 骑手信息 */}
      {!cancelled && <div className="rider-card">
        <div className="rider-avatar">🛵</div>
        <div className="rider-info">
          <div className="rider-name">王师傅 · 尾号 0862</div>
          <div className="rider-status">
            {done ? '已送达' : `${status === 'delivering' ? '正在为您配送' : '准备中'} · 距离您 ${riderDistance.toFixed(1)} km`}
          </div>
        </div>
        <button className="call-btn" onClick={() => showToast('演示模式，未真实拨号')}>
          📞 联系骑手
        </button>
      </div>}

      {/* 配送时间轴 */}
      {!cancelled && <section className="card-section">
        <div className="section-title">配送进度</div>
        <StatusTimeline order={order} status={status} />
      </section>}

      {/* 订单摘要 */}
      <section className="card-section">
        <div className="section-title">
          {order.storeEmoji} {order.storeName}
        </div>
        {order.items.map((item) => (
          <div className="track-item" key={`${item.dishId}|${item.specKey ?? ''}`}>
            <span>
              {item.emoji} {item.name}
              {item.specText ? `（${item.specText}）` : ''} ×{item.qty}
            </span>
            <span>¥{formatPrice(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="track-item track-item--total">
          <span>实付</span>
          <span className="total-price">¥{formatPrice(order.total)}</span>
        </div>
      </section>

      {/* 保障承诺 */}
      {!cancelled && <section className="guarantee-row">
        <span>🕐 准时必达</span>
        <span>💰 超时必赔</span>
        <span>🍃 食材安心</span>
      </section>}

      {/* 操作按钮 */}
      {done ? (
        <div className="track-actions">
          <button className="secondary-btn" onClick={reorder}>
            再来一单
          </button>
          {!reviewed && (
            <button className="secondary-btn" onClick={() => navigate(`/review/${order.id}`)}>
              去评价 ⭐
            </button>
          )}
          <button className="primary-btn" onClick={() => navigate(`/orders/${order.id}`)}>
            查看订单
          </button>
        </div>
      ) : cancelled ? (
        <div className="track-actions">
          <button className="secondary-btn" onClick={reorder}>
            再来一单
          </button>
          <button className="primary-btn" onClick={() => navigate('/')}>
            继续点餐
          </button>
        </div>
      ) : (
        <div className="track-actions">
          {canCancel && (
            <button className="ghost-btn ghost-btn--danger" onClick={handleCancel}>
              取消订单（{formatSeconds(cancelLeftSec)}）
            </button>
          )}
          <button className="ghost-btn" onClick={handleUrge}>
            催一催
          </button>
          <button className="secondary-btn" onClick={() => navigate('/orders')}>
            返回订单列表
          </button>
        </div>
      )}
    </div>
  );
}
