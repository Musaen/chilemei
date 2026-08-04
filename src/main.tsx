import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { OrdersProvider } from './context/OrdersContext';
import { ProfileProvider } from './context/ProfileContext';
import { MealPrefsProvider } from './context/MealPrefsContext';
import App from './App';
import './index.css';

// 应用入口：全局 Provider + 路由
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <CartProvider>
        <OrdersProvider>
          <ProfileProvider>
            <MealPrefsProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </MealPrefsProvider>
          </ProfileProvider>
        </OrdersProvider>
      </CartProvider>
    </ToastProvider>
  </StrictMode>,
);
