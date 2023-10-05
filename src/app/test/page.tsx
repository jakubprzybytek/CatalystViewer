'use client'

import { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import { Auth } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import Head from 'next/head';
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AppBar from '@mui/material/AppBar';
import Slide from '@mui/material/Slide';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Refresh from '@mui/icons-material/Refresh';
import Sort from '@mui/icons-material/SortRounded';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Logout from '@mui/icons-material/Logout';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import BondsViewer from '../../components/BondReportsViewer/BondsViewer';
import IssuersViewer from '../../components/IssuersViewer/IssuersViewer';
import BondReportsFilter, { BondsFiltersProvider, useBondsFilters } from '../../components/BondReportsFilter';
import BondReportsSort, { BondReportsSortOrder, getBondReportsSortingFunction } from '../../components/BondReportsSort';
import { BondReport, getBonds } from '../../sdk';
import { computeStatisticsForInterestBaseTypes } from '../../bonds/statistics';
import { useLocalStorage } from '../../common/UseStorage';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from "aws-amplify";

const amplifyConfig = {
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
  },
  API: {
    endpoints: [
      {
        name: "api",
        endpoint: process.env.NEXT_PUBLIC_API_URL,
        region: process.env.NEXT_PUBLIC_AWS_REGION,
      },
    ],
  },
};

console.log(JSON.stringify(amplifyConfig));
Amplify.configure(amplifyConfig);

enum View {
  Issuers,
  Bonds
}

type HideOnScrollParams = {
  children: React.ReactElement;
}

function HideOnScroll({ children }: HideOnScrollParams): JSX.Element {
  return (
    <Slide appear={false} direction="down" in={!useScrollTrigger()}>
      {children}
    </Slide>
  );
}

function Title(): JSX.Element {
  const { bondTypeFilterString, count } = useBondsFilters();
  return (
    <Typography textAlign='center'>{count} {bondTypeFilterString}</Typography>
  );
}

type PanelParams = {
  shown: boolean;
  children: React.ReactElement;
}

function Panel({ shown, children }: PanelParams): JSX.Element {
  return (
    <Box component='main' display={shown ? 'block' : 'none'} sx={{
      minHeight: '100vh',
      backgroundColor: 'lightblue'
    }}>
      {children}
    </Box>
  );
}

const Home: NextPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // filtering
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useLocalStorage('view', View.Issuers);

  const { bondTypeFilterString } = useBondsFilters();
  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);
  const [allBondTypes, setAllBondTypes] = useState<string[]>([]);

  const [filteredBondReports, setFilteredBondReports] = useState<BondReport[]>([]);
  const filteredBondsStatistics = useMemo(() => computeStatisticsForInterestBaseTypes(filteredBondReports), [filteredBondReports]);

  // sorting
  const [sortMenuTriggerEl, setSortMenuTriggerEl] = useState<null | HTMLElement>(null);
  const [selectedBondReportsSortOrder, setSelectedBondReportsSortOrder] = useLocalStorage<BondReportsSortOrder>('sort.order', BondReportsSortOrder.Name);

  const filteredAndSortedBondsStatistics = useMemo(() =>
    getBondReportsSortingFunction(selectedBondReportsSortOrder)(filteredBondReports), [selectedBondReportsSortOrder, filteredBondReports]);

  function selectBondReportsSortOrder(sortOrder: BondReportsSortOrder) {
    setSelectedBondReportsSortOrder(sortOrder);
    setSortMenuTriggerEl(null);
  }

  async function fetchData(bondType: string) {
    console.log(`Fetching reports for bond type: ${bondType}`);
    try {
      const bonds = await getBonds(bondType);
      setErrorMessage(undefined);
      setAllBondReports(bonds.bondReports);
      setAllBondTypes(bonds.facets.type);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        setAllBondReports([]);
      } else {
        setErrorMessage(Object(error));
        setAllBondReports([]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData(bondTypeFilterString);
  }, [bondTypeFilterString]);

  return (
    <>
      <Head>
        <title>Catalyst Viewer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <HideOnScroll>
        <AppBar component="nav">
          <Toolbar variant='dense'>
            <Stack flexGrow={1}>
              <Stack direction='row' sx={{
                justifyContent: 'space-between'
              }}>
                <Stack flexGrow={1} justifyContent='center'>
                  <Title />
                </Stack>
                <Stack direction='row'>
                  <IconButton color='inherit' disabled={isLoading}
                    onClick={() => { setIsLoading(true); fetchData(bondTypeFilterString); }}>
                    <Refresh />
                  </IconButton>
                  <IconButton color='inherit'
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => setSortMenuTriggerEl(event.currentTarget)}>
                    <Sort />
                  </IconButton>
                  <IconButton color='inherit'
                    onClick={() => setDrawerOpen(true)}>
                    <FilterAlt />
                  </IconButton>
                  <IconButton color='inherit'
                    onClick={() => Auth.signOut()}>
                    <Logout />
                  </IconButton>
                </Stack>
              </Stack>
              <Tabs indicatorColor="secondary" textColor="inherit" centered
                value={view} onChange={(event: React.SyntheticEvent, newValue: View) => setView(newValue)}>
                <Tab label='Issuers' value={View.Issuers} />
                <Tab label='Bonds' value={View.Bonds} />
              </Tabs>
            </Stack>
          </Toolbar>
        </AppBar>
      </HideOnScroll>
      <Box component="nav">
        <Drawer anchor='top' open={drawerOpen}
          //variant='temporary'
          onClose={() => setDrawerOpen(false)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}>
          <Box padding={1}>
            <BondReportsFilter allBondReports={allBondReports} allBondTypes={allBondTypes} setFilteredBondReports={setFilteredBondReports} />
          </Box>
        </Drawer>
      </Box>
      <Box sx={{ height: 88 }} />
      {errorMessage && <Alert severity="error">
        <AlertTitle>Cannot fetch data!</AlertTitle>
        <pre>{errorMessage}</pre>
      </Alert>}
      <BondReportsSort anchorEl={sortMenuTriggerEl} selectedBondReportsSortOrder={selectedBondReportsSortOrder} setBondReportsSortOrder={selectBondReportsSortOrder} />
      <Panel shown={view === View.Issuers}>
        <IssuersViewer bondReports={filteredAndSortedBondsStatistics} loadingBonds={isLoading} statistics={filteredBondsStatistics} />
      </Panel>
      <Panel shown={view === View.Bonds}>
        <BondsViewer bondReports={filteredAndSortedBondsStatistics} loadingBonds={isLoading} statistics={filteredBondsStatistics} />
      </Panel>
    </>
  )
}

const HomeWrapper: NextPage = () => {
  return (
    <BondsFiltersProvider>
      <Authenticator>
        <Home />
      </Authenticator>
    </BondsFiltersProvider>
  )
}

export default HomeWrapper;
