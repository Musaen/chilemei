# AGENTS.md — 吃了没 (chilemei) 项目约束

## 项目概述
「吃了没」是一个无广告、极简风格的外卖 App 演示版。核心设计理念：
- **零图片资源**：所有店铺、菜品、图标均使用 Emoji 展示
- **双模式运行**：后端可用时走 API，不可用时自动降级为内置演示数据
- **CSS 变量主题**：6 套主题色通过 CSS 变量实时切换，无 UI 组件库依赖
- **手机外框模拟**：桌面端 430px 居中显示，模拟真实 App 体验

## 技术栈（严格遵循，禁止擅自更改）

### 前端
- React 18 + Vite + TypeScript（~5.5.4）
- react-router-dom v6（HashRouter，适配 GitHub Pages）
- 状态管理：**React Context only**（禁止引入 Redux / Zustand / MobX）
- 样式：**纯 CSS（index.css）**，禁止引入 Tailwind / styled-components / CSS Modules
- 图标：**Emoji only**，禁止引入 iconfont / SVG 图标库 / 图片资源
- 无外部 UI 组件库（如 Ant Design / Material UI）

### 后端
- Express 4 + TypeScript + tsx
- 数据库：SQLite（better-sqlite3）
- 鉴权：JWT（自实现 signToken / verifyToken）

## 目录结构（强制遵循）
/src
/api          # API 客户端（仅 client.ts，统一请求入口）
/components   # 公共组件（函数式组件，无默认导出要求）
/context      # React Context：每个模块独立文件，含 Provider + useXxx Hook
/data         # 演示数据（stores.ts 含店铺、菜品、分类、地址、忌口选项）
/pages        # 页面级组件（与路由一一对应）
/utils        # 工具函数（纯函数，禁止副作用）
App.tsx       # 路由表（HashRouter + Routes）
index.css     # 全局样式（CSS 变量驱动，禁止拆分多 CSS 文件）
main.tsx      # 入口：Provider 嵌套顺序不可随意更改
theme.ts      # 主题色配置（6 套预设 + getTheme 函数）
types.ts      # 全局类型定义（所有业务类型集中于此）

/server/src
app.ts        # Express 路由（按模块分组：鉴权 / 店铺 / 地址 / 收藏 / 拉黑 / 忌口 / 订单）
auth.ts       # JWT 签发与校验
db.ts         # SQLite 连接与初始化
index.ts      # 服务入口
seed.ts       # 数据库种子数据
test.ts       # API 测试脚本


## 编码规范

### TypeScript
- 全部使用 TypeScript，**禁止 `any`**
- 类型定义统一放在 `src/types.ts`，禁止分散定义
- 组件 Props 使用 `interface` 声明，命名与组件同名（如 `StoreCardProps`）
- API 响应类型复用 `src/types.ts` 中的已有类型

### React
- **函数式组件 + Hooks only**，禁止 Class 组件
- Context 模式标准模板：
  ```ts
  const XxxContext = createContext<XxxCtx | null>(null);
  export function XxxProvider({ children }: { children: ReactNode }) { ... }
  export function useXxx() {
    const ctx = useContext(XxxContext);
    if (!ctx) throw new Error('useXxx 必须在 XxxProvider 内使用');
    return ctx;
  }

## 禁止事项
禁止引入任何 UI 组件库（Ant Design / Material UI / Chakra 等）
禁止引入任何 CSS 框架（Tailwind / Bootstrap / UnoCSS 等）
禁止引入任何状态管理库（Redux / Zustand / Jotai 等）
禁止引入任何图标库或图片资源
禁止拆分 index.css 为多个 CSS 文件
禁止使用 Class 组件
禁止在组件内直接调用 fetch（必须使用 api.client）
禁止修改 Provider 嵌套顺序（main.tsx）
禁止删除或修改演示数据文件（src/data/stores.ts）中的数据结构
禁止破坏演示模式的独立性（GitHub Pages 版本必须可正常运行）

## 样式规范
所有样式写在 src/index.css，禁止新建 .css 文件
使用 CSS 变量（--primary, --bg, --card, --text 等），禁止硬编码色值
类名使用 kebab-case（如 .store-card, .dish-bottom）
按钮/标签圆角统一使用 999px（胶囊形）
卡片圆角使用 var(--radius)（16px）

## API 规范

### 前端
统一使用 api.get / api.post / api.put / api.del（src/api/client.ts）
Token 管理：getToken() / setToken()，Key 为 clm_token
鉴权头格式：authorization: Bearer <token>
### 后端
路由前缀：/api
健康检查：GET /api/health
错误响应格式：{ error: string }
演示验证码固定为 123456
数据库操作使用 better-sqlite3 的同步 API

## 迭代协议
每次只修改一个功能模块，完成后提供变更摘要
涉及 src/types.ts 变更时，必须同步更新所有引用处
新增页面需在 App.tsx 中注册路由，并在 TabBar 中按需配置
新增 Context 需按标准模板实现，并在 main.tsx 中注册 Provider
修改数据库 Schema 时，需同步更新 server/src/db.ts 和 seed.ts
提交前确保演示模式（无后端）仍可正常运行
