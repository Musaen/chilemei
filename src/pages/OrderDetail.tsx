import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useReviews } from '../context/ReviewsContext';
import { useToast } from '../context/ToastContext';
import { canCancelOrder, STATUS_TEXT, formatDay, formatPrice, formatTime, getStatusIndex } from '../utils/format';
import Header from '../components/Header';

// 订单详情：状态、商品、地址、金额

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, statusOf } = useOrders();
  const { reviewedOrderIds } = useReviews();
  const { add } = useCart();
  const { showToast } = useToast();
  const { cancelOrder } = useOrders();
  const order = orderId ? getOrder(orderId) : undefined;

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

  const status = statusOf(order);
  const done = status === 'delivered';
  const cancelled = status === 'cancelled';
  const canCancel = canCancelOrder(order);
  const alreadyReviewed = orderId ? reviewedOrderIds.includes(orderId) : false;

  const reorder = () => {
    for (const item of order.items) {
      for (let i = 0; i < item.qty; i++) add(order.storeId, item.dishId, item.specKey);
    }
    showToast('已加入购物车');
    navigate(`/store/${order.storeId}`);
  };

  /** 取消订单（需二次确认） */
  const handleCancel = async () => {
    if (!window.confirm('确定取消这笔订单吗？演示环境会原路退回支付金额。')) return;
    const ok = await cancelOrder(order.id);
    showToast(ok ? '订单已取消，款项已原路退回（演示）' : '取消失败，可能已过可取消时间');
  };

  return (
    <div className="page order-detail-page">
      <Header title="订单详情" />

      {/* 状态卡 */}
      <div className={cancelled ? 'detail-status detail-status--cancelled' : done ? 'detail-status detail-status--done' : 'detail-status'}>
        <div className="detail-status-emoji">
          {cancelled ? '🚫' : done ? '🎉' : getStatusIndex(status) >= 2 ? '🛵' : '👨‍🍳'}
        </div>
        <div className="detail-status-text">
          <h2>{STATUS_TEXT[status]}</h2>
          <p>
            {formatDay(order.placedAt)} {formatTime(order.placedAt)} 下单 · {order.id}
          </p>
          {cancelled && <p className="status-refund">已取消订单，支付金额已原路退回（演示）</p>}
        </div>
        {!done && !cancelled && (
          <button className="ghost-btn ghost-btn--primary" onClick={() => navigate(`/track/${order.id}`)}>
            查看配送
          </button>
        )}
      </div>

      {/* 店铺与商品 */}
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
        {order.note && <div className="order-note">备注：{order.note}</div>}
        {order.utensils && order.utensils !== '按需' && (
          <div className="order-note">餐具：{order.utensils}</div>
        )}
      </section>

      {/* 金额明细 */}
      <section className="card-section">
        <div className="section-title">金额明细</div>
        <div className="price-rows">
          <div className="price-row">
            <span>商品小计</span>
            <span>¥{order.subtotal.toFixed(2).replace(/\.?0+$/, '')}</span>
          </div>
          <div className="price-row">
            <span>配送费</span>
            <span>¥{order.deliveryFee.toFixed(2).replace(/\.?0+$/, '')}</span>
          </div>
          {(order.promoDiscount ?? 0) > 0 && (
            <div className="price-row price-row--discount">
              <span>店铺满减</span>
              <span>-¥{formatPrice(order.promoDiscount ?? 0)}</span>
            </div>
          )}
          {(order.couponDiscount ?? 0) > 0 && (
            <div className="price-row price-row--discount">
              <span>优惠券</span>
              <span>-¥{formatPrice(order.couponDiscount ?? 0)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="price-row price-row--discount">
              <span>优惠合计</span>
              <span>-¥{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="price-row price-row--total">
            <span>实付</span>
            <span className="total-price">¥{order.total.toFixed(2).replace(/\.?0+$/, '')}</span>
          </div>
        </div>
      </section>

      {/* 配送信息 */}
      <section className="card-section">
        <div className="section-title">配送信息</div>
        <div className="track-item">
          <span>收货人</span>
          <span>
            {order.address.name} {order.address.phone}
          </span>
        </div>
        <div className="track-item">
          <span>收货地址</span>
          <span>{order.address.detail}</span>
        </div>
        <div className="track-item">
          <span>支付方式</span>
          <span>演示支付</span>
        </div>
      </section>

      {/* 操作 */}
      <div className="track-actions">
        {canCancel && (
          <button className="ghost-btn ghost-btn--danger" onClick={handleCancel}>
            取消订单
          </button>
        )}
        {done && !alreadyReviewed && (
          <button className="secondary-btn" onClick={() => navigate(`/review/${order.id}`)}>
            去评价 ⭐
          </button>
        )}
        {!cancelled && (
          <button className="secondary-btn" onClick={reorder}>
            再来一单
          </button>
        )}
        {!cancelled && (
          <button className="primary-btn" onClick={() => navigate('/')}>
            继续点餐
          </button>
        )}
        {cancelled && (
          <button className="primary-btn" onClick={() => navigate('/')}>
            继续点餐
          </button>
        )}
      </div>
    </div>
  );
}
