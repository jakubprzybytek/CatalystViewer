import { useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AppBar from '@mui/material/AppBar';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Refresh from '@mui/icons-material/Refresh';
import FilterAlt from '@mui/icons-material/FilterAlt';
import BondsViewer from '../components/BondsViewer/BondsViewer';
import IssuersViewer from '../components/IssuersViewer/IssuersViewer';
import { BondReport, getBonds } from '../sdk/GetBonds';
import { computeStatistics } from '../bonds/statistics';

enum View {
  Bonds,
  Issuers
}

function DrawerContent(): JSX.Element {
  return (
    <Box>
      Hello world
    </Box>
  );
}


type PanelParams = {
  shown: boolean;
  children: React.ReactNode;
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

  const [view, setView] = useState(View.Bonds);

  const [isLoading, setIsLoading] = useState(false);
  const [allBonds, setAllBonds] = useState<BondReport[]>([]);

  const fetchData = async () => {
    const bonds = await getBonds();
    setAllBonds(bonds);
    setIsLoading(false);
  };

  const bondsStatistics = useMemo(() => computeStatistics(allBonds), [allBonds]);

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

      <AppBar component="nav">
        <Toolbar variant='dense' sx={{
          justifyContent: 'space-between'
        }}>
          <Stack direction='row' spacing={1}>
            <Button variant={view === View.Bonds ? 'outlined' : 'text'} color='inherit'
              onClick={() => setView(View.Bonds)}>
              Bonds
            </Button>
            <Button variant={view === View.Issuers ? 'outlined' : 'text'} color='inherit'
              onClick={() => setView(View.Issuers)}>
              Issuers
            </Button>
          </Stack>
          <Stack direction='row' spacing={1}>
            <IconButton color='inherit' disabled={isLoading}
              onClick={() => { setIsLoading(true); fetchData(); }}>
              <Refresh />
            </IconButton>
            <IconButton color='inherit'
              onClick={() => { setDrawerOpen(true); }}>
              <FilterAlt />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          anchor='top'
          //variant='temporary'
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
        >
          <DrawerContent />
        </Drawer>
      </Box>
      <Toolbar variant='dense' />
      <Panel shown={view === View.Bonds}>
        <BondsViewer bonds={allBonds} loadingBonds={isLoading} bondsStatistics={bondsStatistics} />
      </Panel>
      <Panel shown={view === View.Issuers}>
        <IssuersViewer bonds={allBonds} loadingBonds={isLoading} bondsStatistics={bondsStatistics} />
      </Panel>
    </>
  )
}

export default Home;
