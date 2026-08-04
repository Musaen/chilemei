// 数量步进器：加购 / 修改数量共用

interface StepperProps {
  qty: number;
  onAdd: () => void;
  onMinus: () => void;
  small?: boolean;
}

export default function Stepper({ qty, onAdd, onMinus, small }: StepperProps) {
  if (qty === 0) {
    return (
      <button className={small ? 'add-btn add-btn--small' : 'add-btn'} aria-label="加入购物车" onClick={onAdd}>
        +
      </button>
    );
  }
  return (
    <div className={small ? 'stepper stepper--small' : 'stepper'}>
      <button className="stepper-btn" aria-label="减少" onClick={onMinus}>
        −
      </button>
      <span className="stepper-num">{qty}</span>
      <button className="stepper-btn stepper-btn--add" aria-label="增加" onClick={onAdd}>
        +
      </button>
    </div>
  );
}
