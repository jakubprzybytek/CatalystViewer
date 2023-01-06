import type { NextPage } from 'next';
import Head from 'next/head';
import Box from "@mui/material/Box";
import BondViewer from '../components/BondsViewer';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Catalyst Viewer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box component='main' sx={{
        minHeight: '100vh',
        backgroundColor: 'lightblue'
      }}>
        <BondViewer />
      </Box>
    </>
  )
}

export default Home;
