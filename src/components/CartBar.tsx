import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Store } from '../types';
import { itemKey, useCart } from '../context/CartContext';
import { formatPrice, isStoreOpen } from '../utils/format';
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
  const storeOpen = isStoreOpen(store);
  const remain = store.minOrder - subtotal;
  const canCheckout = storeOpen && count > 0 && remain <= 0;

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
            {items.map((item) => (
              <div className="cart-drawer-item" key={itemKey(item.dish.id, item.specKey)}>
                <span className="cart-drawer-emoji">{item.dish.emoji}</span>
                <div className="cart-drawer-info">
                  <div className="cart-drawer-name">
                    {item.dish.name}
                    {item.specText && <span className="cart-drawer-spec">{item.specText}</span>}
                  </div>
                  <div className="cart-drawer-price">¥{formatPrice(item.unitPrice)}</div>
                </div>
                <Stepper
                  small
                  qty={item.qty}
                  onAdd={() => setQty(store.id, itemKey(item.dish.id, item.specKey), item.qty + 1)}
                  onMinus={() => setQty(store.id, itemKey(item.dish.id, item.specKey), item.qty - 1)}
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
              <span className="cart-bar-tip">
                {!storeOpen
                  ? '店铺休息中'
                  : canCheckout
                    ? '配送费 ¥' + formatPrice(store.deliveryFee)
                    : `还差 ¥${formatPrice(remain)} 起送`}
              </span>
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
          {!storeOpen ? '休息中' : canCheckout ? '去结算' : '未达起送'}
        </button>
      </div>
    </>
  );
}
