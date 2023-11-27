import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { Authenticator } from '@aws-amplify/ui-react';
import Head from 'next/head';
import Box from "@mui/material/Box";
import BondReportsBrowser, { BondReportsBrowserSettings } from '@/components/BondReportsBrowser/BondReportsBrowser';
import BondReportsBrowserSelector from '@/components/BondReportsBrowserSelector';
import { getProfile, putProfile } from '@/sdk/Profiles';
import { Profile } from '@/common/Profile';

const DEFAULT_BOND_REPORTS_BROWSER_SETTINGS_COLLECTION: BondReportsBrowserSettings[] = [
  {
    name: 'default',
    filteringOptions: {
      bondType: 'Corporate bonds',
      maxNominal: 10000,
      markets: ['GPW ASO', 'GPW RR'],
      interestBaseTypes: ['WIBOR 3M', 'WIBOR 6M'],
      issuers: []
    }
  }
];


const Bonds: NextPage = () => {
  //const [settingsCollection, setSettingsCollection] = useState<BondReportsBrowserSettings[]>(DEFAULT_BOND_REPORTS_BROWSER_SETTINGS_COLLECTION);
  const [settingsCollection, setSettingsCollection] = useState<BondReportsBrowserSettings[] | undefined>(undefined);
  const [currentSettingsIndex, setCurrentSettingsIndex] = useState(0);

  function setSettingsCollectionWrapper(settingsCollection: BondReportsBrowserSettings[]) {
    setSettingsCollection(settingsCollection);
    putProfile({
      bondsReportsBrowserSettings: settingsCollection
    });
  }

  // const currectSettings = settingsCollection[currentSettingsIndex];
  // const setCurrentSettings = (settings: BondReportsBrowserSettings) => setSettingsCollectionWrapper(settingsCollection.with(currentSettingsIndex, settings));

  async function fetchProfileAndApplySettings(): Promise<void> {
    console.log('Loading profile');
    const profile = await getProfile();
    console.log(`Profile: ${JSON.stringify(profile)}`);
    if (profile !== undefined) {
      setSettingsCollection(profile.bondsReportsBrowserSettings);
    } else {
      setSettingsCollection(DEFAULT_BOND_REPORTS_BROWSER_SETTINGS_COLLECTION);
    }
  }

  useEffect(() => {
    fetchProfileAndApplySettings();
  }, []);

  return (
    <>
      <Head>
        <title>Catalyst Viewer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {settingsCollection && (
        <>
          <Box>
            <BondReportsBrowser
              settings={settingsCollection[currentSettingsIndex]}
              setSettings={(settings: BondReportsBrowserSettings) => setSettingsCollectionWrapper(settingsCollection.with(currentSettingsIndex, settings))} />
          </Box>
          <BondReportsBrowserSelector settingsCollection={settingsCollection} setSettingsCollection={setSettingsCollectionWrapper} currentSettingsIndex={currentSettingsIndex} setCurrentSettingsIndex={setCurrentSettingsIndex} />
        </>
      )
      }
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
