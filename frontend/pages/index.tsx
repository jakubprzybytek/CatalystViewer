import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Refresh from '@mui/icons-material/Refresh';
import BondsViewer from '../components/BondsViewer/BondsViewer';
import IssuersViewer from '../components/IssuersViewer/IssuersViewer';
import { BondReport, getBonds } from '../sdk/GetBonds';

enum View {
  Bonds,
  Issuers
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
  const [view, setView] = useState(View.Bonds);

  const [isLoading, setIsLoading] = useState(false);
  const [allBonds, setAllBonds] = useState<BondReport[]>([]);

  const fetchData = async () => {
    const bonds = await getBonds();
    setAllBonds(bonds);
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

      <AppBar component="nav">
        <Toolbar variant='dense' sx={{
          justifyContent: 'space-between'
        }}>
          <Stack direction='row' spacing={1}>
            <Button variant='outlined' color='inherit'
              onClick={() => setView(View.Bonds)}>
              Bonds
            </Button>
            <Button variant='outlined' color='inherit'
              onClick={() => setView(View.Issuers)}>
              Issuers
            </Button>
          </Stack>
          <IconButton color='inherit' disabled={isLoading}
            onClick={() => { setIsLoading(true); fetchData(); }}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Toolbar variant='dense' />
      <Panel shown={view === View.Bonds}>
        <BondsViewer bonds={allBonds} loadingBonds={isLoading} />
      </Panel>
      <Panel shown={view === View.Issuers}>
        <IssuersViewer bonds={allBonds} loadingBonds={isLoading} />
      </Panel>
    </>
  )
}

export default Home;
