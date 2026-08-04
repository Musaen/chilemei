import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Order, OrderStatus } from '../types';
import { getOrderStatus } from '../utils/format';

// 订单列表：持久化到 localStorage，配送状态按下单时间实时推导

const STORAGE_KEY = 'clm_orders';

interface OrdersCtx {
  orders: Order[];
  addOrder: (order: Order) => void;
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
  const [orders, setOrders] = useState<Order[]>(loadOrders);

  // 订单变化时写入本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
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
