'use client';

interface HexLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkOnly?: boolean;
}

export function HexLogo({ size = 28, showWordmark = true, wordmarkOnly = false }: HexLogoProps) {
  const width = Math.round(size * (64 / 70));

  return (
    <div className="flex items-center gap-2.5">
      {!wordmarkOnly && (
        <svg
          width={width}
          height={size}
          viewBox="0 0 64 70"
          fill="none"
          className="flex-shrink-0"
        >
          <path
            d="M32 3L59 17.5V48.5L32 63L5 48.5V17.5L32 3Z"
            stroke="var(--hex-logo-structure)"
            strokeWidth="2.5"
            fill="none"
          />
          <line
            x1="32" y1="3" x2="32" y2="63"
            stroke="var(--hex-logo-structure)"
            strokeWidth="1"
            opacity="var(--hex-logo-grid-opacity)"
          />
          <line
            x1="5" y1="17.5" x2="59" y2="48.5"
            stroke="var(--hex-logo-structure)"
            strokeWidth="1"
            opacity="var(--hex-logo-grid-opacity)"
          />
          <line
            x1="5" y1="48.5" x2="52" y2="20"
            stroke="var(--hex-logo-trend)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polyline
            points="47,18 52,20 50,25"
            stroke="var(--hex-logo-trend)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
      {showWordmark && (
        <span className="text-xl font-bold" style={{ letterSpacing: '-0.5px' }}>
          <span style={{ color: 'var(--hex-wordmark-base)' }}>Hex</span>
          <span style={{ color: 'var(--hex-wordmark-accent)' }}>Market</span>
        </span>
      )}
    </div>
  );
}
