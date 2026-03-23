import ClientSpaLoader from './ClientSpaLoader';

export async function generateStaticParams() {
  return [{ path: false }, { path: ['_'] }];
}

export default function Page() {
  return <ClientSpaLoader />;
}
