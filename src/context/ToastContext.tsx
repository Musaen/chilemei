import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// 全局轻提示（Toast），用于「已加入购物车」「演示模式」等反馈

interface Toast {
  id: number;
  text: string;
}

interface ToastCtx {
  showToast: (text: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const showToast = useCallback((text: string) => {
    const id = ++seq.current;
    setToasts((list) => [...list, { id, text }]);
    // 1.8 秒后自动消失
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 1800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 提示浮层 */}
      <div className="toast-layer">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** 使用全局提示 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}
