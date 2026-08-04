import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStoreById } from '../data/stores';
import type { Order } from '../types';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { formatPrice, makeOrderId } from '../utils/format';
import Header from '../components/Header';
import Stepper from '../components/Stepper';

// 结算页：地址、商品明细、价格透明、提交订单

const NOTE_PRESETS = ['不要辣', '少辣', '多放醋', '不要香菜', '加冰', '趁热送'];

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { getStoreCart, setQty, clearStore } = useCart();
  const { orders, addOrder } = useOrders();
  const { addresses, addAddress } = useProfile();
  const { showToast } = useToast();

  const store = useMemo(() => getStoreById(params.get('store') ?? ''), [params]);
  const cart = store ? getStoreCart(store) : { items: [], count: 0, subtotal: 0 };

  const [addrId, setAddrId] = useState(addresses[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ name: '', phone: '', detail: '', tag: '家' });
  const [submitting, setSubmitting] = useState(false);

  // 购物车为空或店铺不存在时回首页
  if (!store || cart.count === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">🛒</div>
        <p>购物车是空的，先去挑点好吃的吧</p>
        <button className="primary-btn" onClick={() => navigate('/')}>
          去首页
        </button>
      </div>
    );
  }

  const selectedAddr = addresses.find((a) => a.id === addrId) ?? addresses[0];
  const isFirstOrder = orders.length === 0;
  const freeDelivery = cart.subtotal >= 30;
  const discount = (isFirstOrder ? 5 : 0) + (freeDelivery ? store.deliveryFee : 0);
  const total = cart.subtotal + store.deliveryFee - discount;

  /** 新增地址 */
  const handleAddAddress = () => {
    if (!addrForm.name.trim() || !addrForm.phone.trim() || !addrForm.detail.trim()) {
      showToast('请完整填写地址信息');
      return;
    }
    addAddress(addrForm);
    setAddrForm({ name: '', phone: '', detail: '', tag: '家' });
    setShowAddrForm(false);
    showToast('地址已添加');
  };

  /** 提交订单 */
  const handleSubmit = () => {
    if (!selectedAddr || submitting) return;
    setSubmitting(true);
    const order: Order = {
      id: makeOrderId(),
      storeId: store.id,
      storeName: store.name,
      storeEmoji: store.emoji,
      items: cart.items.map(({ dish, qty }) => ({
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        qty,
        emoji: dish.emoji,
      })),
      subtotal: cart.subtotal,
      deliveryFee: store.deliveryFee,
      discount,
      total,
      address: selectedAddr,
      note,
      placedAt: Date.now(),
      payMethod: '',
      deliveryTime: store.deliveryTime,
    };
    addOrder(order);
    clearStore(store.id);
    navigate('/payment', { state: { orderId: order.id } });
  };

  return (
    <div className="page checkout-page">
      <Header title="确认订单" />

      {/* 配送地址 */}
      <section className="card-section">
        <div className="section-head">
          <h2 className="section-title">配送至</h2>
        </div>
        {addresses.length > 0 ? (
          <div className="addr-list">
            {addresses.map((a) => (
              <button
                key={a.id}
                className={a.id === addrId ? 'addr-item addr-item--active' : 'addr-item'}
                onClick={() => setAddrId(a.id)}
              >
                <span className="addr-tag">{a.tag}</span>
                <span className="addr-main">
                  <span className="addr-name">
                    {a.name} {a.phone}
                  </span>
                  <span className="addr-detail">{a.detail}</span>
                </span>
                <span className="addr-check">{a.id === addrId ? '✓' : ''}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="addr-empty">还没有收货地址</p>
        )}
        <button className="link-btn" onClick={() => setShowAddrForm((v) => !v)}>
          ＋ 新增地址
        </button>
        {showAddrForm && (
          <div className="addr-form">
            <input placeholder="收货人姓名" value={addrForm.name} onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })} />
            <input placeholder="手机号" value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} />
            <input placeholder="详细地址（小区 + 楼栋 + 门牌）" value={addrForm.detail} onChange={(e) => setAddrForm({ ...addrForm, detail: e.target.value })} />
            <div className="addr-form-tags">
              {['家', '公司', '学校'].map((t) => (
                <button
                  key={t}
                  className={addrForm.tag === t ? 'addr-form-tag addr-form-tag--active' : 'addr-form-tag'}
                  onClick={() => setAddrForm({ ...addrForm, tag: t })}
                >
                  {t}
                </button>
              ))}
            </div>
            <button className="primary-btn" onClick={handleAddAddress}>
              保存地址
            </button>
          </div>
        )}
      </section>

      {/* 商品明细 */}
      <section className="card-section">
        <div className="section-head">
          <h2 className="section-title">
            {store.emoji} {store.name}
          </h2>
        </div>
        <div className="checkout-items">
          {cart.items.map(({ dish, qty }) => (
            <div className="checkout-item" key={dish.id}>
              <span className="checkout-item-emoji">{dish.emoji}</span>
              <span className="checkout-item-name">{dish.name}</span>
              <span className="checkout-item-price">¥{formatPrice(dish.price)}</span>
              <Stepper small qty={qty} onAdd={() => setQty(store.id, dish.id, qty + 1)} onMinus={() => setQty(store.id, dish.id, qty - 1)} />
            </div>
          ))}
        </div>
      </section>

      {/* 备注 */}
      <section className="card-section">
        <div className="section-head">
          <h2 className="section-title">订单备注</h2>
        </div>
        <div className="note-chips">
          {NOTE_PRESETS.map((n) => (
            <button
              key={n}
              className={note === n ? 'note-chip note-chip--active' : 'note-chip'}
              onClick={() => setNote(note === n ? '' : n)}
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          className="note-input"
          placeholder="口味偏好、餐具数量等，告诉商家"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </section>

      {/* 价格明细（透明展示） */}
      <section className="card-section">
        <div className="section-head">
          <h2 className="section-title">价格明细</h2>
          <span className="transparent-badge">无隐藏费用</span>
        </div>
        <div className="price-rows">
          <div className="price-row">
            <span>商品小计</span>
            <span>¥{formatPrice(cart.subtotal)}</span>
          </div>
          <div className="price-row">
            <span>配送费</span>
            <span>{freeDelivery ? <s>¥{formatPrice(store.deliveryFee)}</s> : `¥${formatPrice(store.deliveryFee)}`}</span>
          </div>
          {isFirstOrder && (
            <div className="price-row price-row--discount">
              <span>新人立减</span>
              <span>-¥5</span>
            </div>
          )}
          {freeDelivery && (
            <div className="price-row price-row--discount">
              <span>满 30 免配送费</span>
              <span>-¥{formatPrice(store.deliveryFee)}</span>
            </div>
          )}
          <div className="price-row price-row--total">
            <span>合计</span>
            <span className="total-price">¥{formatPrice(total)}</span>
          </div>
        </div>
      </section>

      {/* 底部提交栏 */}
      <div className="checkout-bar">
        <div className="checkout-bar-info">
          <div className="checkout-bar-total">¥{formatPrice(total)}</div>
          <div className="checkout-bar-eta">预计 {store.deliveryTime} 分钟送达</div>
        </div>
        <button className={submitting ? 'primary-btn primary-btn--disabled' : 'primary-btn'} onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中…' : '提交订单'}
        </button>
      </div>
    </div>
  );
}
