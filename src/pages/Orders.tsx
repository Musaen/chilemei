import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useToast } from '../context/ToastContext';
import { STATUS_TEXT, formatDay, formatTime } from '../utils/format';

// 订单列表：历史订单 + 再来一单

export default function Orders() {
  const navigate = useNavigate();
  const { orders, statusOf } = useOrders();
  const { add } = useCart();
  const { showToast } = useToast();

  /** 再来一单 */
  const reorder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    for (const item of order.items) {
      for (let i = 0; i < item.qty; i++) add(order.storeId, item.dishId);
    }
    showToast('已加入购物车');
    navigate(`/store/${order.storeId}`);
  };

  return (
    <div className="page orders-page">
      <div className="page-head">
        <h1>我的订单</h1>
        <span className="page-head-sub">{orders.length ? `共 ${orders.length} 单` : ''}</span>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">📋</div>
          <p>还没有订单，去吃点好的吧</p>
          <button className="primary-btn" onClick={() => navigate('/')}>
            去点餐
          </button>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => {
            const status = statusOf(order);
            const done = status === 'delivered';
            return (
              <div className="order-card" key={order.id}>
                <div className="order-card-head">
                  <span className="order-store">
                    {order.storeEmoji} {order.storeName}
                  </span>
                  <span className={done ? 'order-status order-status--done' : 'order-status'}>{STATUS_TEXT[status]}</span>
                </div>
                <div className="order-card-items">
                  {order.items.slice(0, 3).map((item) => (
                    <span key={item.dishId} className="order-item-chip">
                      {item.emoji} {item.name}×{item.qty}
                    </span>
                  ))}
                  {order.items.length > 3 && <span className="order-more">等 {order.items.length} 种商品</span>}
                </div>
                <div className="order-card-foot">
                  <span className="order-time">
                    {formatDay(order.placedAt)} {formatTime(order.placedAt)} · {order.id}
                  </span>
                  <span className="order-total">
                    实付 <b>¥{order.total.toFixed(2).replace(/\.?0+$/, '')}</b>
                  </span>
                </div>
                <div className="order-card-actions">
                  {!done && (
                    <button className="ghost-btn" onClick={() => navigate(`/track/${order.id}`)}>
                      查看配送
                    </button>
                  )}
                  <button className="ghost-btn" onClick={() => navigate(`/orders/${order.id}`)}>
                    订单详情
                  </button>
                  <button className="ghost-btn ghost-btn--primary" onClick={() => reorder(order.id)}>
                    再来一单
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
