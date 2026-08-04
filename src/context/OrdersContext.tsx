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
  const [orders, setOrders] = useState<Order[]>([]);

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
            items: order.items.map((i) => ({ dishId: i.dishId, qty: i.qty })),
            addressId: order.address.id,
            note: order.note,
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

  return <OrdersContext.Provider value={{ orders, addOrder, getOrder, statusOf }}>{children}</OrdersContext.Provider>;
}

/** 使用订单 */
export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders 必须在 OrdersProvider 内使用');
  return ctx;
}
