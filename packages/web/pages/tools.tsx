import Head from 'next/head';
import AuthWrapper from '@/components/AuthWrapper';
import ToolsPage from '@/components/Tools/ToolsPage';

function Tools(): React.JSX.Element {
  return (
    <>
      <Head>
        <title>Catalyst Viewer - Tools</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <ToolsPage />
    </>
  );
}

export default function ToolsWrapper(): React.JSX.Element {
  return (
    <AuthWrapper>
      <Tools />
    </AuthWrapper>
  );
}
