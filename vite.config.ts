import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 构建配置：base 使用相对路径，便于直接放到任意静态服务器演示
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
});
