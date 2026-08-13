import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Order, OrderStatus } from '../types';
import { getOrderStatus } from '../utils/format';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// 订单列表：后端可用且已登录时走服务端，否则回退本地存储；配送状态按下单时间实时推导

const STORAGE_KEY = 'clm_orders';

interface OrdersCtx {
  orders: Order[];
  addOrder: (order: Order) => Promise<Order>;
  getOrder: (id: string) => Order | undefined;
  statusOf: (order: Order) => OrderStatus;
  cancelOrder: (orderId: string) => Promise<boolean>;
  urgeOrder: (orderId: string) => Promise<boolean>;
}

const OrdersContext = createContext<OrdersCtx | null>(null);

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { apiMode, token } = useAuth();
  // 初始状态直接从本地恢复：避免 StrictMode 下 effect 二次执行时，
  // 先读本地、再被写入 effect（旧状态空数组）覆盖导致刷新丢订单
  const [orders, setOrders] = useState<Order[]>(() => (token ? [] : loadOrders()));

  // 登录状态或后端可用性变化时重新加载订单
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (apiMode && token) {
        try {
          const data = await api.get<{ orders: Order[] }>('/orders', token);
          if (!cancelled) setOrders(data.orders);
          return;
        } catch {
          // API 异常时回退本地
        }
      }
      if (!cancelled) setOrders(loadOrders());
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [apiMode, token]);

  // 本地回退模式下的订单写入本地存储
  useEffect(() => {
    if (apiMode && token) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders, apiMode, token]);

  /** 创建订单：API 模式调用服务端（价格以服务端计算为准），失败回退本地 */
  const addOrder = async (order: Order): Promise<Order> => {
    if (apiMode && token) {
      try {
        const data = await api.post<{ order: Order }>(
          '/orders',
          {
            storeId: order.storeId,
            items: order.items.map((i) => ({ dishId: i.dishId, qty: i.qty, specKey: i.specKey })),
            addressId: order.address.id,
            note: order.note,
            utensils: order.utensils,
            couponId: order.couponId,
          },
          token,
        );
        setOrders((prev) => [data.order, ...prev]);
        return data.order;
      } catch {
        // 服务端不可用时回退本地订单
      }
    }
    setOrders((prev) => [order, ...prev]);
    return order;
  };

  const getOrder = (id: string) => orders.find((o) => o.id === id);

  const statusOf = (order: Order) => getOrderStatus(order);

  /** 取消订单：窗口期内允许，退款为演示（原路返回） */
  const cancelOrder = async (orderId: string): Promise<boolean> => {
    const order = getOrder(orderId);
    if (!order) return false;
    if (apiMode && token) {
      try {
        const data = await api.post<{ order: Order }>(`/orders/${orderId}/cancel`, {}, token);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        return true;
      } catch {
        return false;
      }
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, cancelled: true } : o)));
    return true;
  };

  /** 催单：每次催单让演示配送加速 8 秒 */
  const urgeOrder = async (orderId: string): Promise<boolean> => {
    const order = getOrder(orderId);
    if (!order) return false;
    if (apiMode && token) {
      try {
        const data = await api.post<{ order: Order }>(`/orders/${orderId}/urge`, {}, token);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        return true;
      } catch {
        return false;
      }
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, urges: (o.urges ?? 0) + 1 } : o)));
    return true;
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, getOrder, statusOf, cancelOrder, urgeOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

/** 使用订单 */
export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders 必须在 OrdersProvider 内使用');
  return ctx;
}
