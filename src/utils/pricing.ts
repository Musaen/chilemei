import type { Coupon, StorePromo } from '../types';
import { bestPromoDiscount, isCouponUsable } from './format';

// 统一计价逻辑：前后端共用，保证演示模式与在线模式价格一致

export interface PricingResult {
  promoDiscount: number; // 店铺满减
  couponDiscount: number; // 优惠券抵扣
  firstOrderDiscount: number; // 新人立减
  freeDelivery: boolean; // 是否免配送费
  deliveryFeePaid: number; // 实际支付的配送费
  discount: number; // 总优惠
  total: number; // 实付
}

/**
 * 计算订单价格
 * 规则（与主流外卖 App 一致，价格全程透明）：
 * 1. 店铺满减：小计满足门槛自动应用金额最大的那档；
 * 2. 优惠券：与满减可叠加，门槛按商品小计判断，过期/已用自动失效；
 * 3. 免配送费：商品小计 ≥ 30 元（或店铺本身免配送费）；
 * 4. 新人立减：首单立减 5 元；
 * 5. 实付最低不为负数。
 */
export function calcPricing(opts: {
  subtotal: number;
  deliveryFee: number;
  promos?: StorePromo[];
  coupon?: Coupon | null;
  isFirstOrder?: boolean;
  freeDeliveryThreshold?: number;
}): PricingResult {
  const subtotal = Math.max(0, opts.subtotal);
  const deliveryFee = Math.max(0, opts.deliveryFee);
  const promoDiscount = bestPromoDiscount(opts.promos, subtotal);
  const couponDiscount =
    opts.coupon && isCouponUsable(opts.coupon, subtotal) ? Math.max(0, opts.coupon.amount) : 0;
  const firstOrderDiscount = opts.isFirstOrder ? 5 : 0;
  const freeDelivery = deliveryFee === 0 || subtotal >= (opts.freeDeliveryThreshold ?? 30);
  const deliveryFeePaid = freeDelivery ? 0 : deliveryFee;
  const discount = promoDiscount + couponDiscount + firstOrderDiscount + (freeDelivery ? deliveryFee : 0);
  const total = Math.max(0, subtotal + deliveryFeePaid - promoDiscount - couponDiscount - firstOrderDiscount);
  return { promoDiscount, couponDiscount, firstOrderDiscount, freeDelivery, deliveryFeePaid, discount, total };
}
