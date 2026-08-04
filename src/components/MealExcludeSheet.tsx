import { MEAL_EXCLUDES } from '../data/stores';
import { useMealPrefs } from '../context/MealPrefsContext';

// 「这一顿不想吃什么」底部选择面板

interface MealExcludeSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function MealExcludeSheet({ open, onClose }: MealExcludeSheetProps) {
  const { excludes, toggle, clear } = useMealPrefs();
  if (!open) return null;

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>这一顿不想吃什么？</h3>
          <span className="sheet-sub">选择后会自动隐藏相关菜品</span>
        </div>
        <div className="sheet-grid">
          {MEAL_EXCLUDES.map((m) => (
            <button
              key={m.key}
              className={excludes.includes(m.key) ? 'exclude-chip exclude-chip--active' : 'exclude-chip'}
              onClick={() => toggle(m.key)}
            >
              <span className="exclude-emoji">{m.emoji}</span>
              {m.label}
              {excludes.includes(m.key) && <span className="exclude-check">✓</span>}
            </button>
          ))}
        </div>
        <div className="sheet-actions">
          {excludes.length > 0 && (
            <button className="secondary-btn" onClick={clear}>
              清空这一顿忌口
            </button>
          )}
          <button className="primary-btn" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
