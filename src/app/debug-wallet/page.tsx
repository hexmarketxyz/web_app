'use client';

import { useEffect, useState } from 'react';

export default function DebugWalletPage() {
  const [info, setInfo] = useState<string>('Detecting...');

  useEffect(() => {
    const lines: string[] = [];

    lines.push(`userAgent: ${navigator.userAgent}`);
    lines.push('');

    // Check known wallet injection paths
    const checks = [
      'window.solana',
      'window.phantom',
      'window.phantom?.solana',
      'window.binancew3w',
      'window.binancew3w?.solana',
      'window.okxwallet',
      'window.okxwallet?.solana',
      'window.ethereum',
      'window.bsc',
    ];

    for (const path of checks) {
      try {
        // eslint-disable-next-line no-eval
        const val = eval(path);
        if (val) {
          lines.push(`✅ ${path} = ${typeof val}`);
          // List own property names
          try {
            const keys = Object.getOwnPropertyNames(val).slice(0, 20);
            lines.push(`   keys: ${keys.join(', ')}`);
          } catch {
            // ignore
          }
          // Check common flags
          for (const flag of ['isPhantom', 'isBinance', 'isBinanceWallet', 'isOkxWallet', 'isBraveWallet', 'isConnected', 'publicKey']) {
            try {
              if ((val as Record<string, unknown>)[flag] !== undefined) {
                lines.push(`   .${flag} = ${JSON.stringify((val as Record<string, unknown>)[flag])}`);
              }
            } catch {
              // ignore
            }
          }
        } else {
          lines.push(`❌ ${path} = ${val}`);
        }
      } catch {
        lines.push(`❌ ${path} = (error)`);
      }
    }

    // Scan window for wallet-like properties
    lines.push('');
    lines.push('--- window properties with "wallet/solana/binance" ---');
    for (const key of Object.getOwnPropertyNames(window)) {
      const lk = key.toLowerCase();
      if (lk.includes('wallet') || lk.includes('solana') || lk.includes('binance') || lk.includes('phantom') || lk.includes('w3w')) {
        try {
          const val = (window as Record<string, unknown>)[key];
          lines.push(`  window.${key} = ${typeof val}`);
        } catch {
          lines.push(`  window.${key} = (access error)`);
        }
      }
    }

    setInfo(lines.join('\n'));
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', color: '#fff', background: '#111' }}>
      <h1 style={{ fontSize: 16, marginBottom: 10 }}>Wallet Debug</h1>
      {info}
    </div>
  );
}
