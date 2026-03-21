# HexMarket Web App

HexMarket 预测市场前端，基于 Next.js 构建，生产环境以静态导出（`output: 'export'`）方式部署。

## 技术栈

- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand (theme, locale, orderbook)
- **Data Fetching**: TanStack React Query + WebSocket (实时行情)
- **Charts**: Lightweight Charts (TradingView)
- **Wallet**: Privy (authentication) + Solana Web3.js
- **SDK**: `@hexmarket/sdk` (TypeScript SDK, workspace 依赖)
- **I18n**: 自定义 i18n，支持 en / zh-CN / zh-TW / ja / ko / vi

## 项目结构

```
src/
├── app/
│   ├── [[...path]]/        # Catch-all SPA 路由
│   │   ├── SpaApp.tsx      # 客户端路由分发
│   │   ├── HomePage.tsx    # 首页（事件列表）
│   │   ├── EventPage.tsx   # 事件详情（交易面板、订单簿、图表）
│   │   ├── CategoryPage.tsx
│   │   └── MarketDetailPage.tsx
│   ├── portfolio/          # 投资组合页面
│   ├── layout.tsx          # 根布局
│   └── globals.css
├── components/
│   ├── auth/               # 钱包连接
│   ├── charts/             # 价格图表、迷你走势图
│   ├── events/             # 事件相关组件（卡片、头部、交易面板、订单簿等）
│   ├── layout/             # Header 导航
│   ├── portfolio/          # 持仓、订单、历史表格
│   ├── providers/          # React Context Providers（Auth, Theme, WebSocket, Query）
│   ├── trading/            # 交易组件（下单面板、订单簿显示、最近成交）
│   ├── ui/                 # 通用 UI 组件（Logo, Avatar, Toast, 语言选择器）
│   └── vault/              # 金库面板
├── hooks/                  # 自定义 Hooks
│   ├── useEvents.ts        # 事件列表/详情查询
│   ├── useOrderBook.ts     # 订单簿 WebSocket 订阅
│   ├── usePlaceOrder.ts    # 下单（含签名）
│   ├── usePortfolioPositions.ts
│   ├── usePriceHistory.ts  # 价格历史（图表数据）
│   ├── useSpaNavigation.tsx # SPA 客户端路由
│   ├── useTranslation.ts   # i18n hook
│   ├── useUnifiedWallet.ts # 统一钱包接口
│   └── ...
├── i18n/                   # 多语言翻译文件
│   ├── en.ts / zh-CN.ts / zh-TW.ts / ja.ts / ko.ts / vi.ts
│   ├── config.ts           # 语言配置
│   └── dynamic.ts          # 动态内容翻译（服务端返回的 translations）
├── lib/                    # 工具函数
├── stores/                 # Zustand stores
│   ├── localeStore.ts      # 语言偏好
│   ├── themeStore.ts       # 主题（light/dark/auto）
│   └── orderBookStore.ts   # 订单簿状态
```

## 路由

采用 Next.js catch-all route `[[...path]]` + 客户端 SPA 路由：

| 路径 | 页面 |
|------|------|
| `/` | 首页（事件列表） |
| `/events/:slug` | 事件详情 |
| `/events/:slug/market/:marketId` | 市场详情 |
| `/category/:slug` | 分类筛选 |
| `/portfolio` | 投资组合（独立 Next.js 页面） |

## 环境变量

在项目根目录创建 `.env.local`：

```env
NEXT_PUBLIC_API_URL=https://api.hexmarket.xyz
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

## 本地开发

```bash
# 在 monorepo 根目录
pnpm install
pnpm dev:web        # 启动 dev server (0.0.0.0:3000)
```

或在本项目目录下：

```bash
pnpm install
pnpm dev            # next dev -H 0.0.0.0
```

## 构建 & 部署

生产环境使用 Next.js 静态导出，输出到 `out/` 目录，由 Nginx 托管静态文件。

```bash
# 构建
pnpm build          # next build → 输出 out/

# 部署（在 monorepo 中执行）
deploy/scripts/deploy_web.sh
```

部署脚本执行流程：
1. `git submodule update --init --recursive`
2. `pnpm install`
3. `pnpm build:web`
4. 将 `out/*` 复制到 `/var/www/hexmarket/web/`

### Nginx 配置要点

- 静态文件目录指向 `/var/www/hexmarket/web/`
- 开启 `trailingSlash`（Next.js 配置已启用）
- SPA fallback：所有未匹配路径返回 `index.html`

## 类型检查

```bash
pnpm type-check     # tsc --noEmit
pnpm lint           # 同上
```
