'use client';

import { useMemo } from 'react';

interface PixelAvatarProps {
  address: string;
  size?: number;
}

// Deterministic pixel avatar from wallet address (5x5 mirrored grid)
export function PixelAvatar({ address, size = 24 }: PixelAvatarProps) {
  const svg = useMemo(() => {
    const bytes = addressToBytes(address);

    // Pick two colors from address bytes
    const hue1 = (bytes[0] * 360) / 256;
    const hue2 = (bytes[1] * 360) / 256;
    const bg = `hsl(${hue1}, 40%, 25%)`;
    const fg = `hsl(${hue2}, 70%, 60%)`;

    // Generate 5x5 grid, mirrored horizontally (only need 3 columns)
    const pixels: boolean[][] = [];
    for (let row = 0; row < 5; row++) {
      const line: boolean[] = [];
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col + 2;
        line.push(bytes[idx % bytes.length] > 127);
      }
      // Mirror: col 0,1,2 → 0,1,2,1,0
      pixels.push([line[0], line[1], line[2], line[1], line[0]]);
    }

    return { bg, fg, pixels };
  }, [address]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      className="rounded-sm"
      style={{ imageRendering: 'pixelated' }}
    >
      <rect width="5" height="5" fill={svg.bg} />
      {svg.pixels.map((row, y) =>
        row.map(
          (on, x) =>
            on && (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={svg.fg} />
            ),
        ),
      )}
    </svg>
  );
}

function addressToBytes(address: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < address.length && bytes.length < 32; i++) {
    bytes.push(address.charCodeAt(i));
  }
  // Pad to at least 17 bytes
  while (bytes.length < 17) bytes.push(0);
  return bytes;
}
