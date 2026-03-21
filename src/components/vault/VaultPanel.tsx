'use client';

import { useState } from 'react';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import {
  useVaultBalance,
  useCreateVault,
  useDeposit,
  useWithdraw,
} from '@/hooks/useVault';

/** Format micro-USDC (6 decimals) to display string. */
function formatUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(2);
}

/** Parse display USDC to micro-USDC. */
function parseUsdc(display: string): number {
  const val = parseFloat(display);
  if (isNaN(val) || val <= 0) return 0;
  return Math.round(val * 1_000_000);
}

export function VaultPanel() {
  const { connected, publicKeyBase58 } = useUnifiedWallet();
  const { data: vaultBalance, isLoading: balanceLoading } = useVaultBalance();
  const createVault = useCreateVault();
  const deposit = useDeposit();
  const withdraw = useWithdraw();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  if (!connected) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <p className="text-sm text-gray-400">Connect wallet to manage vault</p>
      </div>
    );
  }

  const balance = vaultBalance?.usdcBalance ?? 0;
  const hasVault = vaultBalance && vaultBalance.vaultPubkey !== '';
  const isPending = createVault.isPending || deposit.isPending || withdraw.isPending;

  const handleDeposit = async () => {
    const amount = parseUsdc(depositAmount);
    if (amount <= 0) return;
    try {
      await deposit.mutateAsync(amount);
      setDepositAmount('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleWithdraw = async () => {
    const amount = parseUsdc(withdrawAmount);
    if (amount <= 0) return;
    try {
      await withdraw.mutateAsync(amount);
      setWithdrawAmount('');
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Trading Vault</h3>

      {/* Balance display */}
      <div className="mb-4 rounded bg-gray-900 p-3">
        <div className="text-xs text-gray-400">Vault Balance</div>
        <div className="text-lg font-bold text-white">
          {balanceLoading ? '...' : `$${formatUsdc(balance)}`}
        </div>
        {vaultBalance?.vaultPubkey && (
          <div className="mt-1 truncate text-xs text-gray-500">
            {vaultBalance.vaultPubkey}
          </div>
        )}
      </div>

      {/* Create vault (if needed) */}
      {!hasVault && !balanceLoading && (
        <button
          onClick={() => createVault.mutate()}
          disabled={isPending}
          className="mb-3 w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createVault.isPending ? 'Creating...' : 'Create Vault'}
        </button>
      )}

      {/* Deposit / Withdraw tabs */}
      {hasVault && (
        <>
          <div className="mb-3 flex gap-1 rounded bg-gray-900 p-1">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition ${
                activeTab === 'deposit'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition ${
                activeTab === 'withdraw'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Withdraw
            </button>
          </div>

          {activeTab === 'deposit' ? (
            <div className="space-y-2">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="USDC amount"
                min="0"
                step="0.01"
                className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleDeposit}
                disabled={isPending || !depositAmount}
                className="w-full rounded bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {deposit.isPending ? 'Depositing...' : 'Deposit'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="USDC amount"
                min="0"
                step="0.01"
                className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleWithdraw}
                disabled={isPending || !withdrawAmount}
                className="w-full rounded bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {withdraw.isPending ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Error display */}
      {(createVault.error || deposit.error || withdraw.error) && (
        <div className="mt-2 rounded bg-red-900/50 p-2 text-xs text-red-300">
          {(createVault.error || deposit.error || withdraw.error)?.message}
        </div>
      )}

      {/* Success message */}
      {(deposit.isSuccess || withdraw.isSuccess) && (
        <div className="mt-2 rounded bg-green-900/50 p-2 text-xs text-green-300">
          Transaction confirmed
        </div>
      )}
    </div>
  );
}
