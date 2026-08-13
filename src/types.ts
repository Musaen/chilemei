// 全局类型定义

/** 规格选项（如：大杯 / 少冰 / 加辣） */
export interface SpecOption {
  key: string; // 选项唯一键
  label: string; // 选项名
  priceDelta: number; // 相对基础价的加价
}

/** 规格组（如：杯型、冰量、辣度） */
export interface SpecGroup {
  name: string; // 组名
  options: SpecOption[];
}

/** 菜品 */
export interface Dish {
  id: string;
  name: string;
  desc: string;
  price: number;
  originalPrice?: number; // 划线原价（用于展示优惠）
  emoji: string; // 菜品图标，用 emoji 展示，无需图片资源
  sales: number; // 月售
  tags: string[]; // 标签：招牌 / 新品 / 辣 等
  avoid?: string[]; // 忌口关键词：命中「这一顿不吃」时隐藏，如 辣 / 香菜 / 猪肉
  soldOut?: boolean; // 是否售罄
  specs?: SpecGroup[]; // 可选规格：有规格的菜加购前需先选择
}

/** 店铺满减活动（如：满 30 减 6） */
export interface StorePromo {
  label: string; // 活动文案
  threshold: number; // 满 X 元
  discount: number; // 减 Y 元
}

/** 店铺 */
export interface Store {
  id: string;
  name: string;
  emoji: string;
  category: string; // 分类，用于金刚区筛选
  rating: number; // 评分
  monthlySales: number; // 月售
  deliveryTime: number; // 预计送达（分钟）
  deliveryFee: number; // 配送费
  minOrder: number; // 起送价
  distance: number; // 距离（公里）
  tags: string[]; // 店铺标签
  notice: string; // 店铺公告
  banner: string; // 主题色（用于渐变背景）
  openHours: string; // 营业时间，如 "10:00-22:00"
  address: string; // 商家地址（商家信息卡展示）
  license: string; // 资质描述（营业执照 / 食品经营许可证）
  promos?: StorePromo[]; // 满减活动
  dishes: Dish[];
}

/** 购物车条目（菜品 id + 规格键 + 数量） */
export interface CartItem {
  dishId: string;
  specKey?: string; // 规格组合键，无规格菜品为空
  qty: number;
}

/** 购物车：按店铺分组 */
export type CartState = Record<string, CartItem[]>;

/** 订单内菜品快照（下单时把价格等固化下来） */
export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
  specKey?: string; // 规格组合键（再来一单时原样还原）
  specText?: string; // 规格文案（如 大杯 · 少冰）
}

/** 配送地址 */
export interface Address {
  id: string;
  name: string;
  phone: string;
  detail: string;
  tag: string; // 家 / 公司 / 学校 等
}

/** 订单 */
export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  storeEmoji: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  promoDiscount?: number; // 满减优惠（旧数据可能缺失，展示时兜底为 0）
  couponDiscount?: number; // 优惠券抵扣
  discount: number;
  total: number;
  address: Address;
  note: string;
  placedAt: number; // 下单时间戳
  payMethod: string; // 支付方式
  deliveryTime: number; // 预计送达（分钟）
  utensils?: string; // 餐具偏好：不要 / 1 套 / 按需
  couponId?: string; // 使用的优惠券 id
  cancelled?: boolean; // 是否已取消
  urges?: number; // 催单次数（每次演示加速 8 秒）
}

/** 订单配送状态 */
export type OrderStatus = 'paid' | 'preparing' | 'picked' | 'delivering' | 'delivered' | 'cancelled';

/** 优惠券 */
export interface Coupon {
  id: string;
  title: string; // 券名，如 满 40 减 8
  threshold: number; // 使用门槛
  amount: number; // 抵扣金额
  expiresAt: number; // 过期时间戳
  claimedAt?: number; // 领取时间
  usedAt?: number; // 使用时间（未使用为空）
}

/** 评价 */
export interface Review {
  id: string;
  orderId?: string; // 关联订单（种子评价为空）
  storeId: string;
  rating: number; // 1-5 星
  tags: string[]; // 评价标签
  text: string;
  createdAt: number;
  nickname: string;
}
