import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { OrdersProvider } from './context/OrdersContext';
import { ProfileProvider } from './context/ProfileContext';
import { MealPrefsProvider } from './context/MealPrefsContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { StoresProvider } from './context/StoresContext';
import { CouponsProvider } from './context/CouponsContext';
import { ReviewsProvider } from './context/ReviewsContext';
import App from './App';
import './index.css';

// 应用入口：全局 Provider + 路由
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <StoresProvider>
            <CouponsProvider>
              <ReviewsProvider>
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
              </ReviewsProvider>
            </CouponsProvider>
          </StoresProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
