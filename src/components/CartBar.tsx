import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Store } from '../types';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';
import Stepper from './Stepper';

// 店铺详情页底部购物车栏：合计 + 可展开的购物车抽屉

interface CartBarProps {
  store: Store;
}

export default function CartBar({ store }: CartBarProps) {
  const navigate = useNavigate();
  const { getStoreCart, setQty, clearStore } = useCart();
  const { items, count, subtotal } = getStoreCart(store);
  const [open, setOpen] = useState(false);
  const remain = store.minOrder - subtotal;
  const canCheckout = count > 0 && remain <= 0;

  return (
    <>
      {/* 购物车抽屉 */}
      {open && (
        <div className="cart-drawer-mask" onClick={() => setOpen(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-head">
              <span>已选商品</span>
              <button
                className="link-btn"
                onClick={() => {
                  if (window.confirm('确定清空购物车吗？')) clearStore(store.id);
                }}
              >
                清空
              </button>
            </div>
            {items.length === 0 && <div className="cart-empty-hint">购物车还是空的，去加点好吃的吧～</div>}
            {items.map(({ dish, qty }) => (
              <div className="cart-drawer-item" key={dish.id}>
                <span className="cart-drawer-emoji">{dish.emoji}</span>
                <div className="cart-drawer-info">
                  <div className="cart-drawer-name">{dish.name}</div>
                  <div className="cart-drawer-price">¥{formatPrice(dish.price)}</div>
                </div>
                <Stepper
                  small
                  qty={qty}
                  onAdd={() => setQty(store.id, dish.id, qty + 1)}
                  onMinus={() => setQty(store.id, dish.id, qty - 1)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部购物车栏 */}
      <div className="cart-bar">
        <button className="cart-bar-icon" aria-label="查看购物车" onClick={() => setOpen((v) => !v)}>
          🛒
          {count > 0 && <span className="cart-badge">{count}</span>}
        </button>
        <div className="cart-bar-sum">
          {count > 0 ? (
            <>
              <span className="cart-bar-total">¥{formatPrice(subtotal)}</span>
              <span className="cart-bar-tip">{canCheckout ? '配送费 ¥' + formatPrice(store.deliveryFee) : `还差 ¥${formatPrice(remain)} 起送`}</span>
            </>
          ) : (
            <span className="cart-bar-tip">购物车是空的</span>
          )}
        </div>
        <button
          className={canCheckout ? 'cart-bar-btn' : 'cart-bar-btn cart-bar-btn--disabled'}
          disabled={!canCheckout}
          onClick={() => navigate(`/checkout?store=${store.id}`)}
        >
          {canCheckout ? '去结算' : '未达起送'}
        </button>
      </div>
    </>
  );
}
