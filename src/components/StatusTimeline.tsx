import { STATUS_STEPS, getStatusIndex, formatTime } from '../utils/format';
import type { Order, OrderStatus } from '../types';

// 配送状态时间轴：已下单 → 备餐 → 取餐 → 配送中 → 已送达

export default function StatusTimeline({ order, status }: { order: Order; status: OrderStatus }) {
  const current = getStatusIndex(status);
  return (
    <div className="timeline">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <div className={done ? 'timeline-item timeline-item--done' : 'timeline-item'} key={step.key}>
            <div className="timeline-dot-wrap">
              <span className="timeline-dot">{done ? '✓' : i}</span>
              {i < STATUS_STEPS.length - 1 && <span className={done ? 'timeline-line timeline-line--done' : 'timeline-line'} />}
            </div>
            <div className="timeline-text">
              <div className="timeline-title">{step.label}</div>
              <div className="timeline-time">
                {i === 0 ? formatTime(order.placedAt) : i <= current ? '进行中' : '等待中'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
