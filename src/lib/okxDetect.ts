/**
 * OKX Wallet Browser detection utilities.
 *
 * When running inside the OKX wallet's built-in browser, the extension
 * injects `window.okxwallet` with a `.solana` sub-provider.
 */

export interface OkxSolanaProvider {
  isOkxWallet: boolean;
  publicKey: { toBase58(): string } | null;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  signTransaction(transaction: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    okxwallet?: {
      solana?: OkxSolanaProvider;
    };
  }
}

/** Returns true when running inside the OKX wallet browser. */
export function isOkxWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.okxwallet?.solana;
}

/** Returns the OKX Solana provider if available, or null. */
export function getOkxSolanaProvider(): OkxSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  return window.okxwallet?.solana ?? null;
}
