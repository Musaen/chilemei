import { app } from './app';

// 服务入口：默认端口 8787

const PORT = Number(process.env.PORT ?? 8787);

app.listen(PORT, () => {
  console.log(`吃了没 API 服务已启动：http://localhost:${PORT}/api/health`);
});
