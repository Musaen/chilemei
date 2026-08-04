// 全局类型定义

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
  dishes: Dish[];
}

/** 购物车条目（仅存菜品 id 和数量） */
export interface CartItem {
  dishId: string;
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
  discount: number;
  total: number;
  address: Address;
  note: string;
  placedAt: number; // 下单时间戳
  payMethod: string; // 支付方式
  deliveryTime: number; // 预计送达（分钟）
}

/** 订单配送状态 */
export type OrderStatus = 'paid' | 'preparing' | 'picked' | 'delivering' | 'delivered';
