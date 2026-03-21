# HexMarket Web App

Frontend for the HexMarket prediction market, built with Next.js and deployed as a static export (`output: 'export'`).

## Tech Stack

- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand (theme, locale, orderbook)
- **Data Fetching**: TanStack React Query + WebSocket (real-time quotes)
- **Charts**: Lightweight Charts (TradingView)
- **Wallet**: Privy (authentication) + Solana Web3.js
- **SDK**: `@hexmarket/sdk` (TypeScript SDK, workspace dependency)
- **I18n**: Custom i18n supporting en / zh-CN / zh-TW / ja / ko / vi

## Project Structure

```
src/
├── app/
│   ├── [[...path]]/        # Catch-all SPA route
│   │   ├── SpaApp.tsx      # Client-side router
│   │   ├── HomePage.tsx    # Home page (event list)
│   │   ├── EventPage.tsx   # Event detail (trade panel, order book, chart)
│   │   ├── CategoryPage.tsx
│   │   └── MarketDetailPage.tsx
│   ├── portfolio/          # Portfolio page
│   ├── layout.tsx          # Root layout
│   └── globals.css
├── components/
│   ├── auth/               # Wallet connection
│   ├── charts/             # Price charts, sparklines
│   ├── events/             # Event components (card, header, trade panel, order book, etc.)
│   ├── layout/             # Header navigation
│   ├── portfolio/          # Positions, orders, history tables
│   ├── providers/          # React Context Providers (Auth, Theme, WebSocket, Query)
│   ├── trading/            # Trading components (order panel, order book display, recent trades)
│   ├── ui/                 # Common UI components (Logo, Avatar, Toast, language selector)
│   └── vault/              # Vault panel
├── hooks/                  # Custom hooks
│   ├── useEvents.ts        # Event list/detail queries
│   ├── useOrderBook.ts     # Order book WebSocket subscription
│   ├── usePlaceOrder.ts    # Place order (with signature)
│   ├── usePortfolioPositions.ts
│   ├── usePriceHistory.ts  # Price history (chart data)
│   ├── useSpaNavigation.tsx # SPA client-side routing
│   ├── useTranslation.ts   # i18n hook
│   ├── useUnifiedWallet.ts # Unified wallet interface
│   └── ...
├── i18n/                   # Translation files
│   ├── en.ts / zh-CN.ts / zh-TW.ts / ja.ts / ko.ts / vi.ts
│   ├── config.ts           # Locale configuration
│   └── dynamic.ts          # Dynamic content translation (server-returned translations)
├── lib/                    # Utility functions
├── stores/                 # Zustand stores
│   ├── localeStore.ts      # Locale preference
│   ├── themeStore.ts       # Theme (light/dark/auto)
│   └── orderBookStore.ts   # Order book state
```

## Routing

Uses Next.js catch-all route `[[...path]]` with client-side SPA routing:

| Path | Page |
|------|------|
| `/` | Home (event list) |
| `/events/:slug` | Event detail |
| `/events/:slug/market/:marketId` | Market detail |
| `/category/:slug` | Category filter |
| `/portfolio` | Portfolio (standalone Next.js page) |

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=https://api.hexmarket.xyz
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

## Local Development

```bash
# From the monorepo root
pnpm install
pnpm dev:web        # Start dev server (0.0.0.0:3000)
```

Or from this project directory:

```bash
pnpm install
pnpm dev            # next dev -H 0.0.0.0
```

## Build & Deployment

Production uses Next.js static export, outputting to the `out/` directory and served by Nginx as static files.

```bash
# Build
pnpm build          # next build → outputs to out/

# Deploy (run from monorepo root)
deploy/scripts/deploy_web.sh
```

Deployment script steps:
1. `git submodule update --init --recursive`
2. `pnpm install`
3. `pnpm build:web`
4. Copy `out/*` to `/var/www/hexmarket/web/`

### Nginx Configuration Notes

- Document root points to `/var/www/hexmarket/web/`
- `trailingSlash` is enabled in the Next.js config
- SPA fallback: all unmatched paths should return `index.html`

## Type Checking

```bash
pnpm type-check     # tsc --noEmit
pnpm lint           # same as above
```
