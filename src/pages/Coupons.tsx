import { useState } from 'react';
import { COUPON_TEMPLATES } from '../data/coupons';
import { useCoupons } from '../context/CouponsContext';
import { useToast } from '../context/ToastContext';
import { formatDay } from '../utils/format';
import Header from '../components/Header';

// 优惠券：领券中心 + 我的优惠券（可用 / 已用 / 已过期）

type CouponTab = 'claim' | 'mine';

export default function Coupons() {
  const { coupons, claim } = useCoupons();
  const { showToast } = useToast();
  const [tab, setTab] = useState<CouponTab>('claim');

  /** 领取优惠券 */
  const handleClaim = async (id: string) => {
    const ok = await claim(id);
    showToast(ok ? '领取成功，去下单立减！' : '领取失败或已领取过');
  };

  const usable = coupons.filter((c) => !c.usedAt && c.expiresAt >= Date.now());
  const used = coupons.filter((c) => c.usedAt);
  const expired = coupons.filter((c) => !c.usedAt && c.expiresAt < Date.now());

  return (
    <div className="page coupons-page">
      <Header title="优惠券" />

      {/* 券类型切换 */}
      <div className="coupon-tabs">
        <button
          className={tab === 'claim' ? 'coupon-tab coupon-tab--active' : 'coupon-tab'}
          onClick={() => setTab('claim')}
        >
          领券中心
        </button>
        <button
          className={tab === 'mine' ? 'coupon-tab coupon-tab--active' : 'coupon-tab'}
          onClick={() => setTab('mine')}
        >
          我的优惠券（{usable.length}）
        </button>
      </div>

      {tab === 'claim' ? (
        <div className="coupon-list">
          {COUPON_TEMPLATES.map((tpl) => {
            const claimed = coupons.some((c) => c.id === tpl.id && !c.usedAt);
            return (
              <div className="coupon-card" key={tpl.id}>
                <div className="coupon-amount">
                  <span className="coupon-amount-symbol">¥</span>
                  <span className="coupon-amount-num">{tpl.amount}</span>
                </div>
                <div className="coupon-info">
                  <div className="coupon-title">{tpl.title}</div>
                  <div className="coupon-desc">{tpl.desc}</div>
                  <div className="coupon-desc">满 ¥{tpl.threshold} 可用 · 结算时自动匹配最优</div>
                </div>
                <button
                  className={claimed ? 'coupon-claim coupon-claim--done' : 'coupon-claim'}
                  disabled={claimed}
                  onClick={() => handleClaim(tpl.id)}
                >
                  {claimed ? '已领取' : '领取'}
                </button>
              </div>
            );
          })}
          <p className="coupon-tip">演示环境：优惠券不产生真实费用，仅用于体验结算抵扣流程。</p>
        </div>
      ) : (
        <div className="coupon-list">
          {coupons.length === 0 && (
            <div className="empty-state">
              <div className="empty-emoji">🎟️</div>
              <p>还没有优惠券，去领券中心看看～</p>
              <button className="primary-btn" onClick={() => setTab('claim')}>
                去领券
              </button>
            </div>
          )}
          {usable.map((c) => (
            <div className="coupon-card coupon-card--usable" key={c.id}>
              <div className="coupon-amount">
                <span className="coupon-amount-symbol">¥</span>
                <span className="coupon-amount-num">{c.amount}</span>
              </div>
              <div className="coupon-info">
                <div className="coupon-title">{c.title}</div>
                <div className="coupon-desc">满 ¥{c.threshold} 可用 · {formatDay(c.expiresAt)} 前有效</div>
              </div>
              <span className="coupon-state coupon-state--usable">可用</span>
            </div>
          ))}
          {used.map((c) => (
            <div className="coupon-card coupon-card--disabled" key={c.id}>
              <div className="coupon-amount">
                <span className="coupon-amount-symbol">¥</span>
                <span className="coupon-amount-num">{c.amount}</span>
              </div>
              <div className="coupon-info">
                <div className="coupon-title">{c.title}</div>
                <div className="coupon-desc">满 ¥{c.threshold} 可用 · 已使用</div>
              </div>
              <span className="coupon-state coupon-state--used">已用</span>
            </div>
          ))}
          {expired.map((c) => (
            <div className="coupon-card coupon-card--disabled" key={c.id}>
              <div className="coupon-amount">
                <span className="coupon-amount-symbol">¥</span>
                <span className="coupon-amount-num">{c.amount}</span>
              </div>
              <div className="coupon-info">
                <div className="coupon-title">{c.title}</div>
                <div className="coupon-desc">满 ¥{c.threshold} 可用 · 已过期</div>
              </div>
              <span className="coupon-state coupon-state--used">过期</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
