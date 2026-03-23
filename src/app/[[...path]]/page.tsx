import dynamic from 'next/dynamic';

const SpaApp = dynamic(() => import('./SpaApp'), { ssr: false });

export async function generateStaticParams() {
  return [{ path: false }, { path: ['_'] }];
}

export default function Page() {
  return <SpaApp />;
}
