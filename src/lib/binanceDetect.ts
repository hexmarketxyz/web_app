/**
 * Binance Wallet Browser detection utilities.
 *
 * When running inside the Binance wallet's built-in browser, it injects
 * `window.solana` with `isBinance = true` as the Solana provider.
 */

export interface BinanceSolanaProvider {
  isBinance: boolean;
  publicKey: { toBase58(): string } | null;
  isConnected: boolean;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  signTransaction(transaction: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    solana?: BinanceSolanaProvider;
    isBinance?: boolean;
  }
}

/** Returns true when running inside the Binance wallet browser. */
export function isBinanceWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  // window.solana with isBinance flag
  if (window.solana?.isBinance) return true;
  // window.isBinance global flag
  if (window.isBinance) return true;
  return false;
}

/** Returns the Binance Solana provider if available, or null. */
export function getBinanceSolanaProvider(): BinanceSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  if (window.solana?.isBinance) return window.solana;
  return null;
}
