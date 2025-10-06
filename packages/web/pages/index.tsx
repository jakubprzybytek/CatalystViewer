import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Head from 'next/head';
import Box from "@mui/material/Box";
import BondReportsBrowser, { BondReportsBrowserSettings, DEFAULT_FILTERIN_OPTIONS_SETTING, DEFAULT_SORT_ORDER_SETTING, DEFAULT_VIEW_SETTING } from '@/components/BondReportsBrowser';
import BondReportsBrowserSelector from '@/components/BondReportsBrowserSelector';
import { getProfile, putProfile } from '@/sdk/Profiles';

const DEFAULT_BOND_REPORTS_BROWSER_SETTINGS_COLLECTION: BondReportsBrowserSettings[] = [
  {
    name: 'default',
    view: DEFAULT_VIEW_SETTING,
    filteringOptions: DEFAULT_FILTERIN_OPTIONS_SETTING,
    sortOrder: DEFAULT_SORT_ORDER_SETTING
  }
];

const Bonds: NextPage = () => {
  const [settingsCollection, setSettingsCollection] = useState<BondReportsBrowserSettings[] | undefined>(undefined);
  const [currentSettingsIndex, setCurrentSettingsIndex] = useState(0);

  function setSettingsCollectionWrapper(settingsCollection: BondReportsBrowserSettings[]) {
    setSettingsCollection(settingsCollection);
    putProfile({
      bondsReportsBrowserSettings: settingsCollection
    });
  }

  async function fetchProfileAndApplySettings(): Promise<void> {
    console.debug('Loading profile');
    const profile = await getProfile();
    console.debug(`Profile: ${JSON.stringify(profile)}`);
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
          <BondReportsBrowserSelector
            settingsCollection={settingsCollection}
            setSettingsCollection={setSettingsCollectionWrapper}
            currentSettingsIndex={currentSettingsIndex}
            setCurrentSettingsIndex={setCurrentSettingsIndex} />
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
