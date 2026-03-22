'use client';

import { useState, useRef, useEffect } from 'react';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useUsdcBalance } from '@/hooks/useUsdcBalance';
import { useClaimAirdrop } from '@/hooks/useClaimAirdrop';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { useTranslation } from '@/hooks/useTranslation';

export function ConnectButton() {
  const { connected, connecting, walletLabel, publicKeyBase58, disconnect, ready, login } =
    useUnifiedWallet();
  const { data: balanceData } = useUsdcBalance();
  const claimAirdrop = useClaimAirdrop();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // SDK not ready or connecting
  if (!ready || connecting) {
    return (
      <button
        disabled
        className="bg-hex-card border border-hex-border text-theme-secondary px-4 py-2 rounded-lg text-sm cursor-wait"
      >
        {t('auth.connecting')}
      </button>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <button
        onClick={() => login()}
        className="bg-hex-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition"
      >
        {t('auth.signIn')}
      </button>
    );
  }

  // Connected
  const shortAddr = publicKeyBase58
    ? `${publicKeyBase58.slice(0, 2)}...${publicKeyBase58.slice(-4)}`
    : '';

  // usdc_balance is stored as i64 in micro-USDC (6 decimals)
  const usdcDisplay =
    balanceData != null
      ? (balanceData.usdcBalance / 1_000_000).toFixed(2)
      : null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 bg-hex-card border border-hex-border text-theme-primary px-4 py-2 rounded-lg text-sm hover:border-gray-500 transition"
      >
        {publicKeyBase58 && <PixelAvatar address={publicKeyBase58} size={20} />}
        <span className="font-mono">{shortAddr}</span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-hex-card border border-hex-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-hex-border flex items-start gap-3">
            {publicKeyBase58 && <PixelAvatar address={publicKeyBase58} size={32} />}
            <div className="min-w-0">
              <p className="text-xs text-theme-tertiary mb-1">{t('auth.connected')}</p>
              <p className="text-xs font-mono text-theme-primary break-all">
                {publicKeyBase58}
              </p>
            </div>
          </div>
          <div className="px-4 py-2.5 border-b border-hex-border flex items-center justify-between">
            <span className="text-xs text-theme-tertiary">{t('auth.usdcBalance')}</span>
            <span className="text-sm font-medium text-theme-primary">
              {usdcDisplay != null ? `$${usdcDisplay}` : '—'}
            </span>
          </div>
          <button
            onClick={() => claimAirdrop.mutate()}
            disabled={claimAirdrop.isPending}
            className="w-full text-left px-4 py-2.5 text-sm border-b border-hex-border hover:bg-hex-overlay/5 transition disabled:opacity-50"
          >
            {claimAirdrop.isPending ? (
              <span className="text-theme-secondary">{t('auth.claiming')}</span>
            ) : claimAirdrop.isError ? (
              <span className="text-red-400">{claimAirdrop.error.message}</span>
            ) : claimAirdrop.isSuccess ? (
              <span className="text-hex-green">{t('auth.claimedUsdc')}</span>
            ) : (
              <span className="text-hex-blue">{t('auth.claimUsdc')}</span>
            )}
          </button>
          <button
            onClick={async () => {
              setMenuOpen(false);
              await disconnect();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-hex-overlay/5 transition"
          >
            {t('auth.disconnect')}
          </button>
        </div>
      )}
    </div>
  );
}
