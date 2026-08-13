import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MEAL_EXCLUDES } from '../data/stores';
import type { Order } from '../types';
import { itemKey, useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useProfile } from '../context/ProfileContext';
import { useMealPrefs } from '../context/MealPrefsContext';
import { useToast } from '../context/ToastContext';
import { useStores } from '../context/StoresContext';
import { useCoupons } from '../context/CouponsContext';
import { formatPrice, makeOrderId } from '../utils/format';
import { calcPricing } from '../utils/pricing';
import Header from '../components/Header';
import Stepper from '../components/Stepper';

// 结算页：地址、商品明细、价格透明、提交订单

const NOTE_PRESETS = ['不要辣', '少辣', '多放醋', '不要香菜', '加冰', '趁热送'];
const UTENSIL_OPTIONS = ['按需', '不要餐具', '1 套'];

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { getStoreCart, setQty, clearStore } = useCart();
  const { orders, addOrder } = useOrders();
  const { addresses, addAddress } = useProfile();
  const { excludes, toggle } = useMealPrefs();
  const { showToast } = useToast();
  const { getStoreById } = useStores();
  const { coupons, usableCoupons, markUsed } = useCoupons();

  const store = useMemo(() => getStoreById(params.get('store') ?? ''), [params, getStoreById]);
  const cart = store ? getStoreCart(store) : { items: [], count: 0, subtotal: 0 };

  const [addrId, setAddrId] = useState(addresses[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ name: '', phone: '', detail: '', tag: '家' });
  const [submitting, setSubmitting] = useState(false);
  const [couponId, setCouponId] = useState('');
  const [utensils, setUtensils] = useState('按需');

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
  const usable = usableCoupons(cart.subtotal);
  const selectedCoupon = coupons.find((c) => c.id === couponId) ?? null;

  // 小计变化时自动选中金额最大的可用优惠券
  useEffect(() => {
    const best = usable[0];
    if (!best) {
      setCouponId('');
      return;
    }
    setCouponId((prev) => {
      if (!prev) return best.id;
      return usable.some((c) => c.id === prev) ? prev : best.id;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.subtotal]);

  // 结算价格：满减 + 优惠券 + 新人立减 + 免配送费，全程透明
  const pricing = calcPricing({
    subtotal: cart.subtotal,
    deliveryFee: store.deliveryFee,
    promos: store.promos,
    coupon: selectedCoupon,
    isFirstOrder,
  });
  const total = pricing.total;

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
    // 备注 + 忌口合并写入订单
    const finalNote = [note.trim(), excludes.length > 0 ? `忌口：${excludes.join('、')}` : '']
      .filter(Boolean)
      .join('；');
    const order: Order = {
      id: makeOrderId(),
      storeId: store.id,
      storeName: store.name,
      storeEmoji: store.emoji,
      items: cart.items.map(({ dish, qty, specKey, specText, unitPrice }) => ({
        dishId: dish.id,
        name: dish.name,
        price: unitPrice,
        qty,
        emoji: dish.emoji,
        specKey,
        specText,
      })),
      subtotal: cart.subtotal,
      deliveryFee: store.deliveryFee,
      promoDiscount: pricing.promoDiscount,
      couponDiscount: pricing.couponDiscount,
      discount: pricing.discount,
      total,
      address: selectedAddr,
      note: finalNote,
      placedAt: Date.now(),
      payMethod: '',
      deliveryTime: store.deliveryTime,
      utensils,
      couponId: selectedCoupon?.id,
    };
    // 等待订单创建完成（API 模式会先请求服务端），再进入支付页
    addOrder(order).then((created) => {
      markUsed(selectedCoupon?.id);
      clearStore(store.id);
      navigate('/payment', { state: { orderId: created.id } });
    });
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
          {cart.items.map((item) => (
            <div className="checkout-item" key={itemKey(item.dish.id, item.specKey)}>
              <span className="checkout-item-emoji">{item.dish.emoji}</span>
              <div className="checkout-item-main">
                <span className="checkout-item-name">{item.dish.name}</span>
                {item.specText && <span className="checkout-item-spec">{item.specText}</span>}
              </div>
              <span className="checkout-item-price">¥{formatPrice(item.unitPrice)}</span>
              <Stepper
                small
                qty={item.qty}
                onAdd={() => setQty(store.id, itemKey(item.dish.id, item.specKey), item.qty + 1)}
                onMinus={() => setQty(store.id, itemKey(item.dish.id, item.specKey), item.qty - 1)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 优惠券 */}
      <section className="card-section">
        <div className="section-head">
          <h2 className="section-title">优惠券</h2>
          <button className="link-btn" onClick={() => navigate('/coupons')}>
            去领券
          </button>
        </div>
        {usable.length === 0 ? (
          <p className="coupon-empty">还没有满足门槛的优惠券，加购更多商品后自动匹配最优券</p>
        ) : (
          <div className="checkout-coupons">
            {usable.map((c) => (
              <button
                key={c.id}
                className={couponId === c.id ? 'checkout-coupon checkout-coupon--active' : 'checkout-coupon'}
                onClick={() => setCouponId(couponId === c.id ? '' : c.id)}
              >
                <span className="checkout-coupon-left">
                  <span className="checkout-coupon-icon">🎟️</span>
                  <span>
                    {c.title}
                    <span className="checkout-coupon-desc">满 ¥{formatPrice(c.threshold)} 可用</span>
                  </span>
                </span>
                <span className="checkout-coupon-right">
                  -¥{formatPrice(c.amount)}
                  <span className="checkout-coupon-check">{couponId === c.id ? '✓' : ''}</span>
                </span>
              </button>
            ))}
          </div>
        )}
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
        {/* 这一顿忌口：选中的会写进备注告诉商家 */}
        <div className="note-label">这一顿不想吃</div>
        <div className="note-chips">
          {MEAL_EXCLUDES.map((m) => (
            <button
              key={m.key}
              className={excludes.includes(m.key) ? 'note-chip note-chip--active' : 'note-chip'}
              onClick={() => toggle(m.key)}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
        {excludes.length > 0 && (
          <div className="exclude-summary">将随订单告知商家：{excludes.join('、')}</div>
        )}
        {/* 餐具偏好（环保选项） */}
        <div className="note-label">餐具</div>
        <div className="note-chips">
          {UTENSIL_OPTIONS.map((u) => (
            <button
              key={u}
              className={utensils === u ? 'note-chip note-chip--active' : 'note-chip'}
              onClick={() => setUtensils(u)}
            >
              {u === '不要餐具' ? '🌱 ' : ''}
              {u}
            </button>
          ))}
        </div>
        <textarea
          className="note-input"
          placeholder="口味偏好、餐具数量等，告诉商家（忌口已自动填写）"
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
            <span>{pricing.freeDelivery ? <s>¥{formatPrice(store.deliveryFee)}</s> : `¥${formatPrice(store.deliveryFee)}`}</span>
          </div>
          {pricing.promoDiscount > 0 && (
            <div className="price-row price-row--discount">
              <span>店铺满减</span>
              <span>-¥{formatPrice(pricing.promoDiscount)}</span>
            </div>
          )}
          {pricing.couponDiscount > 0 && (
            <div className="price-row price-row--discount">
              <span>优惠券</span>
              <span>-¥{formatPrice(pricing.couponDiscount)}</span>
            </div>
          )}
          {isFirstOrder && (
            <div className="price-row price-row--discount">
              <span>新人立减</span>
              <span>-¥5</span>
            </div>
          )}
          {pricing.freeDelivery && (
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
