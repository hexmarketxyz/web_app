import { Suspense } from 'react';
import SpaApp from './SpaApp';

export async function generateStaticParams() {
  return [{ path: false }, { path: ['_'] }];
}

export default function Page() {
  return (
    <Suspense>
      <SpaApp />
    </Suspense>
  );
}
