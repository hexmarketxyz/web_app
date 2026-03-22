'use client';

import { useState } from 'react';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { usePlaceOrder } from '@/hooks/usePlaceOrder';
import { useTranslation } from '@/hooks/useTranslation';

type TradeSide = 'buy' | 'sell';

export function TradePanel({ outcomeId }: { outcomeId: string }) {
  const { connected, signMessage, login } = useUnifiedWallet();
  const { t } = useTranslation();
  const [side, setSide] = useState<TradeSide>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');

  const placeOrder = usePlaceOrder();

  const priceNum = parseInt(price, 10) || 0; // cents (1-99)
  const amountNum = parseInt(amount, 10) || 0; // shares
  const cost = (priceNum / 100) * amountNum;
  const potentialReturn = amountNum - cost;

  const canSubmit =
    connected &&
    !!signMessage &&
    priceNum >= 1 &&
    priceNum <= 99 &&
    amountNum > 0 &&
    !placeOrder.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    placeOrder.mutate({
      outcomeId,
      side,
      priceCents: priceNum,
      quantity: amountNum,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Buy/Sell Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-hex-border">
        <button
          type="button"
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-sm font-semibold transition ${
            side === 'buy'
              ? 'bg-hex-green text-white'
              : 'bg-transparent text-theme-secondary hover:text-theme-primary'
          }`}
        >
          {t('trading.buy')}
        </button>
        <button
          type="button"
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-sm font-semibold transition ${
            side === 'sell'
              ? 'bg-hex-red text-white'
              : 'bg-transparent text-theme-secondary hover:text-theme-primary'
          }`}
        >
          {t('trading.sell')}
        </button>
      </div>

      {/* Price Input */}
      <div>
        <label className="text-xs text-theme-secondary mb-1 block">
          {t('trading.priceCents')}
        </label>
        <input
          type="number"
          min="1"
          max="99"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 65"
          className="w-full bg-hex-dark border border-hex-border rounded-lg px-3 py-2 text-theme-primary font-mono focus:border-hex-blue focus:outline-none"
        />
      </div>

      {/* Amount Input */}
      <div>
        <label className="text-xs text-theme-secondary mb-1 block">
          {t('trading.shares')}
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 100"
          className="w-full bg-hex-dark border border-hex-border rounded-lg px-3 py-2 text-theme-primary font-mono focus:border-hex-blue focus:outline-none"
        />
      </div>

      {/* Cost Summary */}
      <div className="bg-hex-dark rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-theme-secondary">{t('trading.cost')}</span>
          <span className="font-mono">${cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-theme-secondary">{t('trading.potentialReturn')}</span>
          <span className="font-mono text-hex-green">
            ${potentialReturn.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Error */}
      {placeOrder.isError && (
        <div className="text-red-400 text-sm bg-hex-no-bg/20 rounded-lg px-3 py-2">
          {placeOrder.error instanceof Error
            ? placeOrder.error.message
            : t('trading.failedToPlace')}
        </div>
      )}

      {/* Success */}
      {placeOrder.isSuccess && (
        <div className="text-hex-green text-sm bg-hex-yes-bg/20 rounded-lg px-3 py-2">
          {t('trading.orderPlaced')}
        </div>
      )}

      {/* Submit */}
      {!connected ? (
        <button
          type="button"
          onClick={() => login?.()}
          className="w-full py-3 rounded-lg font-semibold transition bg-hex-blue hover:bg-blue-600 text-white"
        >
          {t('auth.signIn')}
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            canSubmit
              ? 'bg-hex-blue hover:bg-blue-600 text-white'
              : 'bg-gray-700 text-theme-tertiary cursor-not-allowed'
          }`}
        >
          {placeOrder.isPending
            ? t('trading.signing')
            : side === 'buy' ? t('trading.buy') : t('trading.sell')}
        </button>
      )}
    </form>
  );
}
