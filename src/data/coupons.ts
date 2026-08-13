// 优惠券模板：领券中心的固定券池（领取后生成带有效期的用户券）

export interface CouponTemplate {
  id: string;
  title: string; // 券名
  threshold: number; // 使用门槛（满 X 元可用）
  amount: number; // 抵扣金额
  desc: string; // 使用说明
  validDays: number; // 领取后有效天数
}

export const COUPON_TEMPLATES: CouponTemplate[] = [
  {
    id: 'cp_3',
    title: '满 15 减 3',
    threshold: 15,
    amount: 3,
    desc: '全场通用 · 领取后 7 天内有效',
    validDays: 7,
  },
  {
    id: 'cp_5',
    title: '满 20 减 5',
    threshold: 20,
    amount: 5,
    desc: '全场通用 · 领取后 7 天内有效',
    validDays: 7,
  },
  {
    id: 'cp_8',
    title: '满 40 减 8',
    threshold: 40,
    amount: 8,
    desc: '全场通用 · 领取后 7 天内有效',
    validDays: 7,
  },
  {
    id: 'cp_15',
    title: '满 60 减 15',
    threshold: 60,
    amount: 15,
    desc: '全场通用 · 领取后 7 天内有效',
    validDays: 7,
  },
];
