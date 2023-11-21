import { useState } from 'react';
import type { NextPage } from 'next';
import { Authenticator } from '@aws-amplify/ui-react';
import Head from 'next/head';
import Box from "@mui/material/Box";
import BondReportsBrowser, { BondReportsBrowserSettings } from '@/components/BondReportsBrowser/BondReportsBrowser';
import BondReportsBrowserSelector from '@/components/BondReportsBrowserSelector';

const DEFAULT_BOND_REPORTS_BROWSER_SETTINGS_COLLECTION: BondReportsBrowserSettings[] = [
  {
    name: 'default',
    filteringOptions: {
      bondType: 'Corporate bonds',
      maxNominal: 10000,
      markets: ['GPW ASO', 'GPW RR'],
      interestBaseTypes: ['WIBOR 3M'],
      issuers: []
    }
  },
  {
    name: 'second',
    filteringOptions: {
      bondType: 'Corporate bonds',
      maxNominal: 10000,
      markets: ['GPW ASO', 'GPW RR'],
      interestBaseTypes: ['WIBOR 6M'],
      issuers: []
    }
  }
];

const Bonds: NextPage = () => {
  const [settingsCollection, setSettingsCollection] = useState<BondReportsBrowserSettings[]>(DEFAULT_BOND_REPORTS_BROWSER_SETTINGS_COLLECTION);

  const currentSettingsIndex = 0;
  const currectSettings = settingsCollection[currentSettingsIndex];
  const setCurrentSettings = (settings: BondReportsBrowserSettings) => setSettingsCollection(settingsCollection.with(currentSettingsIndex, settings));

  return (
    <>
      <Head>
        <title>Catalyst Viewer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box>
        <BondReportsBrowser settings={currectSettings} setSettings={setCurrentSettings} />
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
