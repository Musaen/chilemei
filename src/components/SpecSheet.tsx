import { useEffect, useState } from 'react';
import type { Dish } from '../types';
import { dishUnitPrice, formatPrice, specKeyOf, specTextOf } from '../utils/format';

// 规格选择底部弹层：有规格的菜品加购前先选规格（如 大杯 / 少冰 / 加量）

interface SpecSheetProps {
  dish: Dish | null;
  onClose: () => void;
  onConfirm: (specKey: string, qty: number) => void;
}

export default function SpecSheet({ dish, onClose, onConfirm }: SpecSheetProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  // 每次打开都重置为每组第一个选项、数量为 1
  useEffect(() => {
    if (dish?.specs) {
      const init: Record<string, string> = {};
      for (const g of dish.specs) {
        if (g.options[0]) init[g.name] = g.options[0].key;
      }
      setSelections(init);
    }
    setQty(1);
  }, [dish]);

  if (!dish) return null;

  const specKey = specKeyOf(selections);
  const unitPrice = dishUnitPrice(dish, specKey);
  const specText = specTextOf(dish, specKey);

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="spec-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="spec-sheet-head">
          <span className="spec-sheet-emoji">{dish.emoji}</span>
          <div className="spec-sheet-info">
            <div className="spec-sheet-name">{dish.name}</div>
            <div className="spec-sheet-price">¥{formatPrice(unitPrice)}</div>
            {specText && <div className="spec-sheet-current">已选：{specText}</div>}
          </div>
          <button className="sheet-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>

        {dish.specs?.map((g) => (
          <div className="spec-group" key={g.name}>
            <div className="spec-group-name">{g.name}</div>
            <div className="spec-options">
              {g.options.map((opt) => (
                <button
                  key={opt.key}
                  className={selections[g.name] === opt.key ? 'spec-option spec-option--active' : 'spec-option'}
                  onClick={() => setSelections((prev) => ({ ...prev, [g.name]: opt.key }))}
                >
                  {opt.label}
                  {opt.priceDelta > 0 && <span className="spec-option-delta">+¥{formatPrice(opt.priceDelta)}</span>}
                  {opt.priceDelta < 0 && <span className="spec-option-delta">-¥{formatPrice(-opt.priceDelta)}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="spec-sheet-foot">
          <div className="stepper">
            <button className="stepper-btn" aria-label="减少" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span className="stepper-num">{qty}</span>
            <button className="stepper-btn stepper-btn--add" aria-label="增加" onClick={() => setQty((q) => q + 1)}>
              +
            </button>
          </div>
          <button className="primary-btn spec-confirm" onClick={() => onConfirm(specKey, qty)}>
            加入购物车 ¥{formatPrice(unitPrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
