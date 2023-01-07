import { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Box from "@mui/material/Box";
import BondsViewer from '../components/BondsViewer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';

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

  return (
    <>
      <Head>
        <title>Catalyst Viewer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AppBar component="nav">
        <Toolbar variant='dense' sx={{
          '& > button': {
            mr: 1
          }
        }}>
          <Button variant='outlined' color='inherit'
            onClick={() => setView(View.Bonds)}>
            Bonds
          </Button>
          <Button variant='outlined' color='inherit'
            onClick={() => setView(View.Issuers)}>
            Issuers
          </Button>
        </Toolbar>
      </AppBar>

      <Toolbar variant='dense' />
      <Panel shown={view === View.Bonds}>
        <BondsViewer />
      </Panel>
      <Panel shown={view === View.Issuers}>
        Issuers
      </Panel>
    </>
  )
}

export default Home;
