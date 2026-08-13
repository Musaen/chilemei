import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders } from '../context/OrdersContext';
import { useReviews } from '../context/ReviewsContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/format';
import Header from '../components/Header';

// 评价页：订单送达后可评价（星级 + 标签 + 文字）

const STAR_LABELS = ['', '很不满意', '不满意', '一般', '满意', '非常满意'];

const TAGS = ['味道好', '分量足', '包装好', '送达快', '值得回购', '口味一般', '分量偏少', '送得慢'];

export default function Review() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder } = useOrders();
  const { reviewedOrderIds, addReview } = useReviews();
  const { showToast } = useToast();
  const order = orderId ? getOrder(orderId) : undefined;

  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 非送达订单或已评价过的订单不允许重复评价
  const alreadyReviewed = orderId ? reviewedOrderIds.includes(orderId) : false;
  const notDelivered = order ? (order.cancelled ? true : Date.now() - order.placedAt < 80 * 1000) : true;

  if (!order || alreadyReviewed || notDelivered) {
    return (
      <div className="page">
        <Header title="评价订单" />
        <div className="empty-state">
          <div className="empty-emoji">📝</div>
          <p>{alreadyReviewed ? '这个订单你已经评价过啦，谢谢～' : '订单送达后才能评价'}</p>
          <button className="primary-btn" onClick={() => navigate('/orders')}>
            去订单列表
          </button>
        </div>
      </div>
    );
  }

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  /** 提交评价 */
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const ok = await addReview({
      storeId: order.storeId,
      orderId: order.id,
      rating,
      tags,
      text: text.trim(),
    });
    setSubmitting(false);
    if (ok) {
      showToast('感谢评价，评分已同步到店铺');
      navigate(`/store/${order.storeId}`);
    } else {
      showToast('提交失败，请稍后再试');
    }
  };

  return (
    <div className="page review-page">
      <Header title="评价订单" />

      {/* 订单摘要 */}
      <div className="review-order-card">
        <div className="review-order-store">
          {order.storeEmoji} {order.storeName}
        </div>
        <div className="review-order-items">
          {order.items.slice(0, 3).map((i) => (
            <span className="order-item-chip" key={i.dishId}>
              {i.emoji} {i.name}×{i.qty}
            </span>
          ))}
          <span className="review-order-total">实付 ¥{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* 星级 */}
      <section className="card-section">
        <div className="section-title">这单体验如何？</div>
        <div className="star-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={n <= rating ? 'star-btn star-btn--on' : 'star-btn'}
              aria-label={`${n} 星`}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>
        <div className="star-label">{STAR_LABELS[rating]}</div>
      </section>

      {/* 评价标签 */}
      <section className="card-section">
        <div className="section-title">打个标签（可多选）</div>
        <div className="review-tags">
          {TAGS.map((t) => (
            <button
              key={t}
              className={tags.includes(t) ? 'review-tag review-tag--active' : 'review-tag'}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* 文字评价 */}
      <section className="card-section">
        <div className="section-title">说说这单怎么样</div>
        <textarea
          className="note-input"
          placeholder="口味、分量、包装、配送速度…（选填）"
          rows={4}
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </section>

      <div className="checkout-bar">
        <button className={submitting ? 'primary-btn primary-btn--disabled' : 'primary-btn'} onClick={submit} disabled={submitting}>
          {submitting ? '提交中…' : '提交评价'}
        </button>
      </div>
    </div>
  );
}
