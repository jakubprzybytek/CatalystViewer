import Head from 'next/head';
import AuthWrapper from '@/components/AuthWrapper';
import FinancialsPage from '@/components/Financials/FinancialsPage';

function Financials(): React.JSX.Element {
  return (
    <>
      <Head>
        <title>Catalyst Viewer - Financials</title>
      </Head>
      <FinancialsPage />
    </>
  );
}

export default function FinancialsWrapper(): React.JSX.Element {
  return (
    <AuthWrapper>
      <Financials />
    </AuthWrapper>
  );
}
