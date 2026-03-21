import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'HexMarket - Decentralized Prediction Market',
  description: 'Trade on the outcome of future events on Solana',
};

const themeScript = `(function(){try{var m=localStorage.getItem('hex-theme')||'dark';var t=m;if(m==='auto'){var h=new Date().getHours();t=h>=6&&h<18?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
const localeScript = `(function(){try{var l=localStorage.getItem('hex-locale')||'en';document.documentElement.setAttribute('lang',l);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="bg-hex-dark text-theme-primary min-h-screen">
        <Providers>
          <Header />
          <main className="container mx-auto px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
