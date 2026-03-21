'use client';

import { useState, useEffect } from 'react';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { usePlaceOrder } from '@/hooks/usePlaceOrder';
import { usePortfolioPositions } from '@/hooks/usePortfolioPositions';
import { useAllOpenOrders } from '@/hooks/useAllOpenOrders';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/hooks/useTranslation';
import { translateDynamic } from '@/i18n/dynamic';
import type { Outcome, EventDetail } from '@hexmarket/sdk';

import { imageUrl } from '@/lib/imageUrl';

type TradeSide = 'buy' | 'sell';
type OrderMode = 'market' | 'limit';
type Expiration = '5m' | '1h' | '12h' | '24h';

export interface SellRequest {
  outcomeId: string;
  quantity: number;
}

interface EventTradePanelProps {
  outcome: Outcome;
  outcomes: Outcome[];
  event: EventDetail;
  isMultiMarket: boolean;
  onSelectOutcome: (id: string) => void;
  sellRequest?: SellRequest | null;
}

/* ─── Price helpers ───────────────────────────────────────── */

/** Count decimal places in a number (e.g. 0.01 → 2, 0.001 → 3) */
function countDecimals(n: number): number {
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

/** Snap a price to the nearest increment and clamp to (0, 1) exclusive */
function snapPrice(price: number, increment: number): number {
  const snapped = Math.round(price / increment) * increment;
  const decimals = countDecimals(increment);
  const clamped = Math.max(increment, Math.min(1 - increment, snapped));
  return parseFloat(clamped.toFixed(decimals));
}

/* ─── Main Component ──────────────────────────────────────── */

export function EventTradePanel({
  outcome,
  outcomes,
  event,
  isMultiMarket,
  onSelectOutcome,
  sellRequest,
}: EventTradePanelProps) {
  const { connected, signMessage } = useUnifiedWallet();
  const placeOrder = usePlaceOrder();
  const { data: positions } = usePortfolioPositions();
  const { data: allOrders } = useAllOpenOrders();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  const hasSellRequest = sellRequest != null && sellRequest.outcomeId === outcome.id;
  const [side, setSide] = useState<TradeSide>(() => hasSellRequest ? 'sell' : 'buy');
  const [orderType, setOrderType] = useState<OrderMode>(() => hasSellRequest ? 'market' : 'limit');
  const [shares, setShares] = useState(() => hasSellRequest ? sellRequest.quantity : 0);
  const [amount, setAmount] = useState(0); // dollars for market buy
  const [expirationOn, setExpirationOn] = useState(false);
  const [expiration, setExpiration] = useState<Expiration>('1h');
  const [showOrderTypeMenu, setShowOrderTypeMenu] = useState(false);
  const [showMarketMenu, setShowMarketMenu] = useState(false);

  // Find market for this outcome
  const market = event.markets?.find((m) => m.id === outcome.marketId);
  const priceIncrement = Number(market?.priceIncrement ?? 0.01);

  // limitPrice is stored as a decimal (0.01 - 0.99)
  const [limitPrice, setLimitPrice] = useState(() =>
    snapPrice(outcome.price ?? 0.5, priceIncrement),
  );

  // Reset inputs when outcome changes; apply sellRequest if present
  useEffect(() => {
    setLimitPrice(snapPrice(outcome.price ?? 0.5, priceIncrement));
    if (sellRequest && sellRequest.outcomeId === outcome.id) {
      setSide('sell');
      setOrderType('market');
      setShares(sellRequest.quantity);
      setAmount(0);
    } else {
      setShares(0);
      setAmount(0);
    }
  }, [outcome.id, priceIncrement, sellRequest]);

  // Filter outcomes to same market
  const marketOutcomes = outcomes.filter(
    (o) => o.marketId === outcome.marketId,
  );

  // Header for multi-market
  const headerIconUrl = market?.iconUrl ?? event.iconUrl;
  const headerTitle = market
    ? translateDynamic(market.title, market.titleTranslations, locale)
    : '';

  // Available position for current outcome (total minus locked by open sell orders)
  const totalShares = positions?.find((p) => p.outcomeId === outcome.id)?.quantity ?? 0;
  const lockedShares = (allOrders ?? [])
    .filter((o) => o.side === 'sell' && o.outcomeId === outcome.id)
    .reduce((sum, o) => sum + o.remainingQuantity, 0);
  const availableShares = Math.max(totalShares - lockedShares, 0);

  // Calculations
  const buyLimitTotal = limitPrice * shares;
  const buyLimitToWin = shares - buyLimitTotal;
  const sellLimitReceive = limitPrice * shares;

  // Submit
  const canSubmit = (() => {
    if (!connected || !signMessage || placeOrder.isPending) return false;
    if (orderType === 'market' && side === 'buy') return amount > 0;
    if (orderType === 'limit') {
      return limitPrice > 0 && limitPrice < 1 && shares > 0;
    }
    return shares > 0; // market sell
  })();

  const outcomeLabel = translateDynamic(outcome.label, outcome.labelTranslations, locale);
  const toastSubtitle = headerTitle || '';

  const showLimitToast = (toastSide: string, qty: number, priceCents: number) => {
    const sideLabel = toastSide === 'buy' ? t('trading.buy') : t('trading.sell');
    showToast({
      type: 'success',
      title: `${sideLabel} ${outcomeLabel} ${t('toast.placed')}`,
      subtitle: toastSubtitle,
      detail: `${qty.toFixed(2)} shares @ ${priceCents.toFixed(0)}¢`,
    });
  };

  const showMarketToast = (toastSide: string, detail: string) => {
    const sideLabel = toastSide === 'buy' ? t('trading.buy') : t('trading.sell');
    showToast({
      type: 'success',
      title: `${t('trading.market')} ${sideLabel} ${outcomeLabel} ${t('toast.submitted')}`,
      subtitle: toastSubtitle,
      detail,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (orderType === 'limit') {
      placeOrder.mutate(
        {
          outcomeId: outcome.id,
          side,
          priceCents: limitPrice * 100,
          quantity: shares,
          orderType: 'limit',
          timeInForce: 'gtc',
        },
        { onSuccess: () => showLimitToast(side, shares, limitPrice * 100) },
      );
    } else if (side === 'buy') {
      // Market buy: match at any price, never rests on book
      const currentPrice = outcome.price ?? 0.5;
      const qty = Math.floor(amount / currentPrice);
      if (qty <= 0) return;
      placeOrder.mutate(
        {
          outcomeId: outcome.id,
          side: 'buy',
          priceCents: 99,
          quantity: qty,
          orderType: 'market',
          timeInForce: 'ioc',
        },
        { onSuccess: () => showMarketToast('buy', `$${amount.toFixed(2)} · ${qty} shares`) },
      );
    } else {
      // Market sell: match at any price, never rests on book
      placeOrder.mutate(
        {
          outcomeId: outcome.id,
          side: 'sell',
          priceCents: 1,
          quantity: shares,
          orderType: 'market',
          timeInForce: 'ioc',
        },
        { onSuccess: () => showMarketToast('sell', `${shares} shares`) },
      );
    }
  };

  return (
    <div className="bg-hex-card rounded-xl border border-hex-border overflow-hidden">
      {/* Header — multi-market only, with dropdown to switch markets */}
      {isMultiMarket && (
        <div className="relative border-b border-hex-border">
          <button
            type="button"
            onClick={() => setShowMarketMenu(!showMarketMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hex-overlay/[0.02] transition"
          >
            {headerIconUrl && (
              <img
                src={imageUrl(headerIconUrl)}
                alt=""
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <span className="text-sm font-semibold truncate flex-1 text-left">
              {headerTitle}
            </span>
            <svg
              className={`w-4 h-4 text-theme-tertiary flex-shrink-0 transition-transform ${showMarketMenu ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showMarketMenu && event.markets && event.markets.length > 1 && (
            <div className="absolute left-0 right-0 top-full bg-hex-card border border-hex-border rounded-b-xl shadow-lg z-20 py-1">
              {event.markets.map((m) => {
                const isActive = m.id === outcome.marketId;
                const mIcon = m.iconUrl ?? event.iconUrl;
                const mTitle = translateDynamic(m.title, m.titleTranslations, locale);
                const firstOutcome = outcomes.find((o) => o.marketId === m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (firstOutcome) onSelectOutcome(firstOutcome.id);
                      setShowMarketMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                      isActive
                        ? 'bg-hex-blue/10 text-hex-blue'
                        : 'text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/[0.03]'
                    }`}
                  >
                    {mIcon && (
                      <img
                        src={imageUrl(mIcon)}
                        alt=""
                        className="w-6 h-6 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <span className="text-sm font-medium truncate">{mTitle}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Buy/Sell + Order Type row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`text-sm font-semibold pb-1 border-b-2 transition ${
              side === 'buy'
                ? 'text-theme-primary border-theme-primary'
                : 'text-theme-tertiary border-transparent hover:text-theme-secondary'
            }`}
          >
            {t('trading.buy')}
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`text-sm font-semibold pb-1 border-b-2 transition ${
              side === 'sell'
                ? 'text-theme-primary border-theme-primary'
                : 'text-theme-tertiary border-transparent hover:text-theme-secondary'
            }`}
          >
            {t('trading.sell')}
          </button>
        </div>

        {/* Order type dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setShowOrderTypeMenu(true)}
          onMouseLeave={() => setShowOrderTypeMenu(false)}
        >
          <button
            type="button"
            className="text-sm text-theme-secondary hover:text-theme-primary flex items-center gap-1"
          >
            {orderType === 'market' ? t('trading.market') : t('trading.limit')}
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showOrderTypeMenu && (
            <div className="absolute right-0 top-full mt-0.5 bg-hex-dark border border-hex-border rounded-lg shadow-lg z-10 py-1 min-w-[100px]">
              <button
                type="button"
                onClick={() => {
                  setOrderType('market');
                  setShowOrderTypeMenu(false);
                }}
                className={`block w-full text-left px-3 py-1.5 text-sm transition ${
                  orderType === 'market'
                    ? 'text-hex-blue'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5'
                }`}
              >
                {t('trading.market')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType('limit');
                  setShowOrderTypeMenu(false);
                }}
                className={`block w-full text-left px-3 py-1.5 text-sm transition ${
                  orderType === 'limit'
                    ? 'text-hex-blue'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-hex-overlay/5'
                }`}
              >
                {t('trading.limit')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Outcome selector */}
      <div className="flex gap-2 px-4 pb-3">
        {marketOutcomes.map((o) => {
          const priceCents = ((o.price ?? 0.5) * 100).toFixed(1);
          const isActive = o.id === outcome.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelectOutcome(o.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                isActive
                  ? 'bg-hex-green/20 text-hex-green border border-hex-green/40'
                  : 'bg-hex-dark text-theme-secondary border border-hex-border hover:border-hex-border-hover'
              }`}
            >
              {translateDynamic(o.label, o.labelTranslations, locale)} {priceCents}¢
            </button>
          );
        })}
      </div>

      {/* Mode-specific body */}
      <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
        {orderType === 'market' && side === 'buy' && (
          <MarketBuyBody amount={amount} setAmount={setAmount} />
        )}
        {orderType === 'market' && side === 'sell' && (
          <MarketSellBody shares={shares} setShares={setShares} availableShares={availableShares} />
        )}
        {orderType === 'limit' && side === 'buy' && (
          <LimitBuyBody
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            priceIncrement={priceIncrement}
            shares={shares}
            setShares={setShares}
            total={buyLimitTotal}
            toWin={buyLimitToWin}
            expirationOn={expirationOn}
            setExpirationOn={setExpirationOn}
            expiration={expiration}
            setExpiration={setExpiration}
          />
        )}
        {orderType === 'limit' && side === 'sell' && (
          <LimitSellBody
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            priceIncrement={priceIncrement}
            shares={shares}
            setShares={setShares}
            receive={sellLimitReceive}
            availableShares={availableShares}
            expirationOn={expirationOn}
            setExpirationOn={setExpirationOn}
            expiration={expiration}
            setExpiration={setExpiration}
          />
        )}

        {/* Error */}
        {placeOrder.isError && (
          <div className="text-red-400 text-sm bg-hex-no-bg/20 rounded-lg px-3 py-2">
            {placeOrder.error instanceof Error
              ? placeOrder.error.message
              : t('trading.failedToPlace')}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            canSubmit
              ? side === 'buy'
                ? 'bg-hex-blue hover:bg-blue-600 text-white'
                : 'bg-hex-red hover:bg-red-600 text-white'
              : 'bg-hex-dark text-theme-tertiary border border-hex-border cursor-not-allowed'
          }`}
        >
          {!connected
            ? t('auth.signIn')
            : placeOrder.isPending
              ? t('trading.signing')
              : t('trading.trade')}
        </button>
      </form>
    </div>
  );
}

/* ─── Price Stepper ────────────────────────────────────────── */

function PriceStepper({
  value,
  onChange,
  priceIncrement,
}: {
  value: number; // decimal price (0.01-0.99)
  onChange: (v: number) => void;
  priceIncrement: number;
}) {
  // Display in cents: 0.65 → 65, increment 0.01 → 1¢, 0.001 → 0.1¢
  const centsIncrement = priceIncrement * 100;
  const centsDecimals = countDecimals(centsIncrement);
  const centsValue = value * 100;
  const [inputText, setInputText] = useState(centsValue.toFixed(centsDecimals));
  const [isFocused, setIsFocused] = useState(false);

  // Sync inputText from value when not focused
  useEffect(() => {
    if (!isFocused) {
      setInputText((value * 100).toFixed(centsDecimals));
    }
  }, [value, centsDecimals, isFocused]);

  const handleDecrement = () => {
    onChange(snapPrice(value - priceIncrement, priceIncrement));
  };

  const handleIncrement = () => {
    onChange(snapPrice(value + priceIncrement, priceIncrement));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsedCents = parseFloat(inputText);
    if (isNaN(parsedCents) || parsedCents <= 0 || parsedCents >= 100) {
      // Reset to current value
      setInputText(centsValue.toFixed(centsDecimals));
      return;
    }
    const snapped = snapPrice(parsedCents / 100, priceIncrement);
    onChange(snapped);
    setInputText((snapped * 100).toFixed(centsDecimals));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDecrement}
        className="w-8 h-8 rounded-lg bg-hex-dark border border-hex-border text-theme-secondary hover:text-theme-primary hover:border-hex-border-hover flex items-center justify-center text-lg font-mono"
      >
        −
      </button>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-20 text-center text-lg font-bold font-mono bg-hex-dark border border-hex-border rounded-lg py-1 pr-5 text-theme-primary focus:border-hex-blue focus:outline-none"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-tertiary text-sm font-mono">¢</span>
      </div>
      <button
        type="button"
        onClick={handleIncrement}
        className="w-8 h-8 rounded-lg bg-hex-dark border border-hex-border text-theme-secondary hover:text-theme-primary hover:border-hex-border-hover flex items-center justify-center text-lg font-mono"
      >
        +
      </button>
    </div>
  );
}

/* ─── Expiration Controls ──────────────────────────────────── */

function ExpirationControls({
  on,
  setOn,
  value,
  setValue,
}: {
  on: boolean;
  setOn: (v: boolean) => void;
  value: Expiration;
  setValue: (v: Expiration) => void;
}) {
  const { t } = useTranslation();
  const options: Expiration[] = ['5m', '1h', '12h', '24h'];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-theme-secondary">{t('trading.setExpiration')}</span>
        <button
          type="button"
          onClick={() => setOn(!on)}
          className={`w-9 h-5 rounded-full transition relative ${
            on ? 'bg-hex-blue' : 'bg-hex-border'
          }`}
        >
          <span
            className={`block w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${
              on ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </div>
      {on && (
        <div className="flex gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setValue(opt)}
              className={`flex-1 py-1 rounded text-xs font-medium transition ${
                value === opt
                  ? 'bg-hex-blue/20 text-hex-blue'
                  : 'bg-hex-dark text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Quick Buttons ────────────────────────────────────────── */

function QuickButtons({
  buttons,
  onClick,
}: {
  buttons: { label: string; value: number }[];
  onClick: (value: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={() => onClick(btn.value)}
          className="flex-1 py-1.5 rounded-lg bg-hex-dark border border-hex-border text-xs text-theme-secondary hover:text-theme-primary hover:border-hex-border-hover transition"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Market Buy Body ──────────────────────────────────────── */

function MarketBuyBody({
  amount,
  setAmount,
}: {
  amount: number;
  setAmount: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div>
        <label className="text-xs text-theme-secondary mb-1 block">
          {t('trading.amount')}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary text-lg font-mono">
            $
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            placeholder="0"
            className="w-full bg-hex-dark border border-hex-border rounded-lg pl-8 pr-3 py-2.5 text-lg font-mono text-theme-primary focus:border-hex-blue focus:outline-none"
          />
        </div>
      </div>
      <QuickButtons
        buttons={[
          { label: '+$1', value: 1 },
          { label: '+$5', value: 5 },
          { label: '+$10', value: 10 },
          { label: '+$100', value: 100 },
          { label: 'Max', value: 0 },
        ]}
        onClick={(v) => {
          if (v === 0) return; // Max: placeholder
          setAmount(amount + v);
        }}
      />
    </>
  );
}

/* ─── Market Sell Body ─────────────────────────────────────── */

function MarketSellBody({
  shares,
  setShares,
  availableShares,
}: {
  shares: number;
  setShares: (v: number) => void;
  availableShares: number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div>
        <label className="text-xs text-theme-secondary mb-1 block">
          {t('trading.shares')}
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={shares || ''}
          onChange={(e) => setShares(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="0"
          className="w-full bg-hex-dark border border-hex-border rounded-lg px-3 py-2.5 text-lg font-mono text-theme-primary focus:border-hex-blue focus:outline-none"
        />
      </div>
      <QuickButtons
        buttons={[
          { label: '25%', value: 25 },
          { label: '50%', value: 50 },
          { label: 'Max', value: 100 },
        ]}
        onClick={(v) => {
          setShares(Math.floor(availableShares * v / 100));
        }}
      />
    </>
  );
}

/* ─── Limit Buy Body ───────────────────────────────────────── */

function LimitBuyBody({
  limitPrice,
  setLimitPrice,
  priceIncrement,
  shares,
  setShares,
  total,
  toWin,
  expirationOn,
  setExpirationOn,
  expiration,
  setExpiration,
}: {
  limitPrice: number;
  setLimitPrice: (v: number) => void;
  priceIncrement: number;
  shares: number;
  setShares: (v: number) => void;
  total: number;
  toWin: number;
  expirationOn: boolean;
  setExpirationOn: (v: boolean) => void;
  expiration: Expiration;
  setExpiration: (v: Expiration) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {/* Limit Price */}
      <div>
        <label className="text-xs text-theme-secondary mb-1.5 block">
          {t('trading.limitPrice')}
        </label>
        <PriceStepper value={limitPrice} onChange={setLimitPrice} priceIncrement={priceIncrement} />
      </div>

      {/* Shares */}
      <div>
        <label className="text-xs text-theme-secondary mb-1 block">
          {t('trading.shares')}
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={shares || ''}
          onChange={(e) => setShares(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="0"
          className="w-full bg-hex-dark border border-hex-border rounded-lg px-3 py-2.5 text-lg font-mono text-theme-primary focus:border-hex-blue focus:outline-none"
        />
      </div>

      {/* Quick buttons */}
      <QuickButtons
        buttons={[
          { label: '−100', value: -100 },
          { label: '−10', value: -10 },
          { label: '+10', value: 10 },
          { label: '+100', value: 100 },
          { label: '+20', value: 20 },
        ]}
        onClick={(v) => setShares(Math.max(0, shares + v))}
      />

      {/* Expiration */}
      <ExpirationControls
        on={expirationOn}
        setOn={setExpirationOn}
        value={expiration}
        setValue={setExpiration}
      />

      {/* Summary */}
      <div className="bg-hex-dark rounded-lg p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-theme-secondary">{t('trading.total')}</span>
          <span className="font-mono">${total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-theme-secondary">{t('trading.toWin')}</span>
          <span className="font-mono text-hex-green">
            ${toWin.toFixed(2)}
          </span>
        </div>
      </div>
    </>
  );
}

/* ─── Limit Sell Body ──────────────────────────────────────── */

function LimitSellBody({
  limitPrice,
  setLimitPrice,
  priceIncrement,
  shares,
  setShares,
  receive,
  availableShares,
  expirationOn,
  setExpirationOn,
  expiration,
  setExpiration,
}: {
  limitPrice: number;
  setLimitPrice: (v: number) => void;
  priceIncrement: number;
  shares: number;
  setShares: (v: number) => void;
  receive: number;
  availableShares: number;
  expirationOn: boolean;
  setExpirationOn: (v: boolean) => void;
  expiration: Expiration;
  setExpiration: (v: Expiration) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {/* Limit Price */}
      <div>
        <label className="text-xs text-theme-secondary mb-1.5 block">
          {t('trading.limitPrice')}
        </label>
        <PriceStepper value={limitPrice} onChange={setLimitPrice} priceIncrement={priceIncrement} />
      </div>

      {/* Shares */}
      <div>
        <label className="text-xs text-theme-secondary mb-1 block">
          {t('trading.shares')}
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={shares || ''}
          onChange={(e) => setShares(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="0"
          className="w-full bg-hex-dark border border-hex-border rounded-lg px-3 py-2.5 text-lg font-mono text-theme-primary focus:border-hex-blue focus:outline-none"
        />
      </div>

      {/* Quick buttons */}
      <QuickButtons
        buttons={[
          { label: '25%', value: 25 },
          { label: '50%', value: 50 },
          { label: 'Max', value: 100 },
        ]}
        onClick={(v) => {
          setShares(Math.floor(availableShares * v / 100));
        }}
      />

      {/* Expiration */}
      <ExpirationControls
        on={expirationOn}
        setOn={setExpirationOn}
        value={expiration}
        setValue={setExpiration}
      />

      {/* Summary */}
      <div className="bg-hex-dark rounded-lg p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-theme-secondary">{t('trading.youllReceive')}</span>
          <span className="font-mono">${receive.toFixed(2)}</span>
        </div>
      </div>
    </>
  );
}
