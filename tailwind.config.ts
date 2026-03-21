import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        hex: {
          // Accent colors — same in both themes
          green: '#22c55e',
          red: '#ef4444',
          blue: '#3b82f6',
          // Theme-adaptive surface colors (CSS variables, RGB channels)
          dark: 'rgb(var(--hex-dark) / <alpha-value>)',
          card: 'rgb(var(--hex-card) / <alpha-value>)',
          border: 'rgb(var(--hex-border) / <alpha-value>)',
          // Overlay for hover effects
          overlay: 'rgb(var(--hex-overlay) / <alpha-value>)',
          // Outcome tint backgrounds
          'yes-bg': 'rgb(var(--hex-yes-bg) / <alpha-value>)',
          'no-bg': 'rgb(var(--hex-no-bg) / <alpha-value>)',
        },
      },
      textColor: {
        theme: {
          primary: 'rgb(var(--hex-text-primary))',
          secondary: 'rgb(var(--hex-text-secondary))',
          tertiary: 'rgb(var(--hex-text-tertiary))',
        },
      },
    },
  },
  plugins: [],
};

export default config;
