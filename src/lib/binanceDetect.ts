/**
 * Binance Wallet Browser detection utilities.
 *
 * When running inside the Binance wallet's built-in browser, the extension
 * injects `window.binancew3w` with a `.solana` sub-provider.
 */

export interface BinanceSolanaProvider {
  isBinance?: boolean;
  publicKey: { toBase58(): string } | null;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  signTransaction(transaction: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    binancew3w?: {
      solana?: BinanceSolanaProvider;
    };
  }
}

/** Returns true when running inside the Binance wallet browser. */
export function isBinanceWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  // Primary: Binance Web3 Wallet injects window.binancew3w.solana
  if (window.binancew3w?.solana) return true;
  // Fallback: user agent detection for Binance in-app browser
  return /BinanceWeb3/i.test(navigator.userAgent);
}

/** Returns the Binance Solana provider if available, or null. */
export function getBinanceSolanaProvider(): BinanceSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  return window.binancew3w?.solana ?? null;
}
