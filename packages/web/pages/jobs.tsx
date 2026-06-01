import Head from 'next/head';
import AuthWrapper from '@/components/AuthWrapper';
import JobsPage from '@/components/Jobs/JobsPage';

function Jobs(): React.JSX.Element {
  return (
    <>
      <Head>
        <title>Catalyst Viewer - Jobs</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <JobsPage />
    </>
  );
}

export default function JobsWrapper(): React.JSX.Element {
  return (
    <AuthWrapper>
      <Jobs />
    </AuthWrapper>
  );
}
