import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrders } from '../context/OrdersContext';
import { formatPrice } from '../utils/format';
import Header from '../components/Header';

// 模拟支付页：支付方式切换、确认支付、成功动画

const METHODS = [
  { key: 'wechat', name: '微信支付', icon: '💚', desc: '推荐使用' },
  { key: 'alipay', name: '支付宝', icon: '💙', desc: '' },
  { key: 'card', name: '银行卡', icon: '🏦', desc: '' },
];

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getOrder } = useOrders();
  const orderId = (location.state as { orderId?: string } | null)?.orderId;
  const order = orderId ? getOrder(orderId) : undefined;

  const [method, setMethod] = useState('wechat');
  const [phase, setPhase] = useState<'idle' | 'processing' | 'paid'>('idle');

  // 进入页面先重置支付状态
  useEffect(() => {
    setPhase('idle');
  }, [orderId]);

  // 订单不存在时回首页
  if (!order) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">💳</div>
        <p>没有找到待支付的订单</p>
        <button className="primary-btn" onClick={() => navigate('/')}>
          回首页
        </button>
      </div>
    );
  }

  /** 模拟支付：转圈 1.2 秒后成功 */
  const handlePay = () => {
    if (phase !== 'idle') return;
    setPhase('processing');
    setTimeout(() => setPhase('paid'), 1200);
  };

  return (
    <div className="page payment-page">
      <Header title="收银台" onBack={() => navigate(-1)} />
      <div className="payment-body">
        {/* 金额 */}
        <div className="pay-amount-card">
          <div className="pay-amount-label">需支付</div>
          <div className="pay-amount">¥{formatPrice(order.total)}</div>
          <div className="pay-store">{order.storeEmoji} {order.storeName}</div>
          <div className="pay-order-id">订单号 {order.id}</div>
        </div>

        {phase === 'paid' ? (
          /* 支付成功 */
          <div className="pay-success">
            <div className="success-check">✓</div>
            <h2>支付成功</h2>
            <p>商家已接单，正在为您备餐</p>
            <button className="primary-btn" onClick={() => navigate(`/track/${order.id}`)}>
              查看配送进度 →
            </button>
          </div>
        ) : (
          <>
            {/* 支付方式 */}
            <div className="pay-methods">
              <div className="section-title">支付方式</div>
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  className={method === m.key ? 'pay-method pay-method--active' : 'pay-method'}
                  onClick={() => setMethod(m.key)}
                >
                  <span className="pay-method-icon">{m.icon}</span>
                  <span className="pay-method-name">
                    {m.name}
                    {m.desc && <span className="pay-method-desc">{m.desc}</span>}
                  </span>
                  <span className="pay-method-check">{method === m.key ? '✓' : '○'}</span>
                </button>
              ))}
            </div>

            {/* 支付按钮 */}
            <button className={phase === 'processing' ? 'pay-btn pay-btn--processing' : 'pay-btn'} onClick={handlePay} disabled={phase === 'processing'}>
              {phase === 'processing' ? (
                <span className="pay-processing">
                  <span className="spinner" />
                  支付中…
                </span>
              ) : (
                <>确认支付 ¥{formatPrice(order.total)}</>
              )}
            </button>
            <p className="pay-tip">演示模式 · 不会产生真实扣款</p>
          </>
        )}
      </div>
    </div>
  );
}
