import type { NextPage } from 'next';
import { Authenticator } from '@aws-amplify/ui-react';
import Head from 'next/head';
import Box from "@mui/material/Box";
import BondReportsBrowser from '@/components/BondReportsBrowser/BondReportsBrowser';
import BondReportsBrowserSelector from '@/components/BondReportsBrowserSelector';

const Bonds: NextPage = () => {

  return (
    <>
      <Head>
        <title>Catalyst Viewer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box>
        <BondReportsBrowser />
      </Box>
      <BondReportsBrowserSelector />
    </>
  )
}

const BondsWrapper: NextPage = () => {
  return (
    <Authenticator>
      <Bonds />
    </Authenticator>
  )
}

export default BondsWrapper;
