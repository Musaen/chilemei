import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useToast } from '../context/ToastContext';
import { STATUS_TEXT, formatDay, formatTime, getStatusIndex } from '../utils/format';
import Header from '../components/Header';

// 订单详情：状态、商品、地址、金额

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, statusOf } = useOrders();
  const { add } = useCart();
  const { showToast } = useToast();
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

  const reorder = () => {
    for (const item of order.items) {
      for (let i = 0; i < item.qty; i++) add(order.storeId, item.dishId);
    }
    showToast('已加入购物车');
    navigate(`/store/${order.storeId}`);
  };

  return (
    <div className="page order-detail-page">
      <Header title="订单详情" />

      {/* 状态卡 */}
      <div className={done ? 'detail-status detail-status--done' : 'detail-status'}>
        <div className="detail-status-emoji">{done ? '🎉' : getStatusIndex(status) >= 2 ? '🛵' : '👨‍🍳'}</div>
        <div className="detail-status-text">
          <h2>{STATUS_TEXT[status]}</h2>
          <p>
            {formatDay(order.placedAt)} {formatTime(order.placedAt)} 下单 · {order.id}
          </p>
        </div>
        {!done && (
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
          <div className="track-item" key={item.dishId}>
            <span>
              {item.emoji} {item.name} ×{item.qty}
            </span>
            <span>¥{(item.price * item.qty).toFixed(2).replace(/\.?0+$/, '')}</span>
          </div>
        ))}
        {order.note && <div className="order-note">备注：{order.note}</div>}
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
          {order.discount > 0 && (
            <div className="price-row price-row--discount">
              <span>优惠</span>
              <span>-¥{order.discount.toFixed(2).replace(/\.?0+$/, '')}</span>
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
        <button className="secondary-btn" onClick={reorder}>
          再来一单
        </button>
        <button className="primary-btn" onClick={() => navigate('/')}>
          继续点餐
        </button>
      </div>
    </div>
  );
}
