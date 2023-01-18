import { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
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
import Refresh from '@mui/icons-material/Refresh';
import FilterAlt from '@mui/icons-material/FilterAlt';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import BondsFilter from '../components/BondsFilter/BondsFilter';
import BondsViewer from '../components/BondsViewer/BondsViewer';
import IssuersViewer from '../components/IssuersViewer/IssuersViewer';
import { BondReport, getBonds } from '../sdk/GetBonds';
import { computeStatisticsForInterestBaseTypes } from '../bonds/statistics';

enum View {
  Bonds,
  Issuers
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState(View.Issuers);

  const [isLoading, setIsLoading] = useState(false);
  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);

  const [filteredBondReports, setFilteredBondReports] = useState<BondReport[]>([]);
  const filteredBondsStatistics = useMemo(() => computeStatisticsForInterestBaseTypes(filteredBondReports), [filteredBondReports]);

  const fetchData = async () => {
    const bonds = await getBonds();
    setAllBondReports(bonds);
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, []);

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
                  <Typography textAlign='center'>{filteredBondReports.length} bonds</Typography>
                </Stack>
                <Stack direction='row'>
                  <IconButton color='inherit' disabled={isLoading}
                    onClick={() => { setIsLoading(true); fetchData(); }}>
                    <Refresh />
                  </IconButton>
                  <IconButton color='inherit'
                    onClick={() => { setDrawerOpen(true); }}>
                    <FilterAlt />
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
            <Typography>Select filters:</Typography>
            <BondsFilter allBondReports={allBondReports} setFilteredBondReports={setFilteredBondReports} />
          </Box>
        </Drawer>
      </Box>
      <Toolbar sx={{ height: 88 }}  />
      <Panel shown={view === View.Issuers}>
        <IssuersViewer bondReports={filteredBondReports} loadingBonds={isLoading} statistics={filteredBondsStatistics} />
      </Panel>
      <Panel shown={view === View.Bonds}>
        <BondsViewer bondReports={filteredBondReports} loadingBonds={isLoading} statistics={filteredBondsStatistics} />
      </Panel>
    </>
  )
}

export default Home;
