import type { Coupon, Dish, Order, OrderStatus, Store, StorePromo } from '../types';

/** 演示配送时间轴（单位：秒，相对下单时间） */
export const TIMELINE = {
  preparing: 0, // 下单即开始备餐
  picked: 18, // 18 秒后骑手取餐
  delivering: 40, // 40 秒后开始配送
  delivered: 80, // 80 秒后送达（演示加速）
};

/** 可取消订单的时间窗口（单位：秒，下单后 15 秒内可取消） */
export const CANCEL_WINDOW_SEC = 15;

/** 每次催单的演示加速秒数 */
export const URGE_BOOST_SEC = 8;

/** 配送状态步骤顺序 */
export const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'paid', label: '已下单' },
  { key: 'preparing', label: '商家备餐' },
  { key: 'picked', label: '骑手取餐' },
  { key: 'delivering', label: '配送中' },
  { key: 'delivered', label: '已送达' },
];

/** 状态对应的提示文案 */
export const STATUS_TEXT: Record<OrderStatus, string> = {
  paid: '订单已支付',
  preparing: '商家正在备餐',
  picked: '骑手已取餐，正在赶来',
  delivering: '骑手配送中',
  delivered: '订单已送达，趁热吃！',
  cancelled: '订单已取消',
};

/** 根据下单时间推导当前配送状态（刷新安全） */
export function getOrderStatus(order: Order, now = Date.now()): OrderStatus {
  if (order.cancelled) return 'cancelled';
  const elapsed = (now - order.placedAt) / 1000;
  // 催单会加速演示进度：每次催单相当于时间前移 8 秒
  const boost = (order.urges ?? 0) * URGE_BOOST_SEC;
  const t = elapsed + boost;
  if (t >= TIMELINE.delivered) return 'delivered';
  if (t >= TIMELINE.delivering) return 'delivering';
  if (t >= TIMELINE.picked) return 'picked';
  if (t >= TIMELINE.preparing) return 'preparing';
  return 'paid';
}

/** 是否还可以取消订单（下单后窗口内且未取消） */
export function canCancelOrder(order: Order, now = Date.now()): boolean {
  if (order.cancelled) return false;
  const elapsed = (now - order.placedAt) / 1000;
  return elapsed < CANCEL_WINDOW_SEC;
}

/** 状态进度（0-4，用于时间轴高亮） */
export function getStatusIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1; // 已取消单独处理
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

/** 格式化价格：保留两位小数，去掉多余的 0 */
export function formatPrice(n: number): string {
  const fixed = n.toFixed(2);
  return fixed.replace(/\.?0+$/, '');
}

/** 格式化时间为 HH:mm */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 格式化日期：今天 / 昨天 / M月d日 */
export function formatDay(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 当前时段（用于「现在适合吃」推荐） */
export function getPeriod(hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 10) return '早餐';
  if (hour >= 10 && hour < 14) return '午餐';
  if (hour >= 14 && hour < 17) return '下午茶';
  if (hour >= 17 && hour < 21) return '晚餐';
  return '夜宵';
}

/** 打招呼文案 */
export function greeting(hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 10) return '早上好';
  if (hour >= 10 && hour < 14) return '中午好';
  if (hour >= 14 && hour < 17) return '下午好';
  if (hour >= 17 && hour < 21) return '晚上好';
  return '夜深了';
}

/** 生成订单号 */
export function makeOrderId(): string {
  return 'CLM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

/** 生成唯一 id */
export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 秒数格式化为 mm:ss */
export function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** 判断店铺当前是否营业（支持 "10:00-22:00" 与跨天 "16:00-02:00"） */
export function isStoreOpen(store: Store, now = new Date()): boolean {
  if (!store.openHours) return true;
  const [startRaw, endRaw] = store.openHours.split('-').map((s) => s.trim());
  if (!startRaw || !endRaw) return true;
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const start = toMin(startRaw);
  const end = toMin(endRaw);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (end > start) return nowMin >= start && nowMin < end;
  // 跨天营业（如 16:00-02:00）
  return nowMin >= start || nowMin < end;
}

/** 店铺当前营业状态文案 */
export function storeOpenText(store: Store, now = new Date()): string {
  return isStoreOpen(store, now) ? '营业中' : '休息中';
}

/** 根据选中的规格键计算菜品单价（基础价 + 所有规格加价） */
export function dishUnitPrice(dish: Dish, specKey?: string): number {
  if (!specKey || !dish.specs || dish.specs.length === 0) return dish.price;
  const selected = new Set(specKey.split('|'));
  let price = dish.price;
  for (const group of dish.specs) {
    for (const opt of group.options) {
      if (selected.has(opt.key)) price += opt.priceDelta;
    }
  }
  return price;
}

/** 规格键 → 可读文案（如 "大杯 · 少冰"），未知键自动忽略 */
export function specTextOf(dish: Dish, specKey?: string): string {
  if (!specKey || !dish.specs || dish.specs.length === 0) return '';
  const selected = new Set(specKey.split('|'));
  const labels: string[] = [];
  for (const group of dish.specs) {
    for (const opt of group.options) {
      if (selected.has(opt.key)) labels.push(opt.label);
    }
  }
  return labels.join(' · ');
}

/** 一组规格选择 → 规格键（按选项 key 排序拼接，保证幂等） */
export function specKeyOf(selections: Record<string, string>): string {
  return Object.values(selections).sort().join('|');
}

/** 优惠券当前是否可用 */
export function isCouponUsable(coupon: Coupon, subtotal: number, now = Date.now()): boolean {
  if (coupon.usedAt) return false;
  if (coupon.expiresAt && coupon.expiresAt < now) return false;
  return subtotal >= coupon.threshold;
}

/** 从满减规则中取当前小计能享受的最大优惠（无则返回 0） */
export function bestPromoDiscount(promos: StorePromo[] | undefined, subtotal: number): number {
  if (!promos || promos.length === 0) return 0;
  return promos
    .filter((p) => subtotal >= p.threshold)
    .reduce((max, p) => Math.max(max, p.discount), 0);
}

/** 判断菜品是否命中「这一顿不想吃什么」 */
export function isDishExcluded(dish: Dish, excludes: string[]): boolean {
  if (excludes.length === 0 || !dish.avoid || dish.avoid.length === 0) return false;
  return dish.avoid.some((a) => excludes.includes(a));
}
