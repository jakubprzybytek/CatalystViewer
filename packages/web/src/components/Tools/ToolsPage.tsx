import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import MainNavigation from '@/components/MainNavigation';
import { getCatalystDailyStats, type CatalystDailyStatsResult } from '@/sdk/Bonds';

export default function ToolsPage(): React.JSX.Element {
  const [stats, setStats] = useState<CatalystDailyStatsResult | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function fetchDailyStats(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const result = await getCatalystDailyStats();
      const sorted = [...result].sort((a, b) => a.name.localeCompare(b.name));
      setStats(sorted);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStats(undefined);
    }
    setIsLoading(false);
  }

  return (
    <>
      <MainNavigation title='Tools' />
      <Box sx={{ height: 48 }} />
      <Box sx={{ mt: 2, px: { xs: 1, sm: 2 } }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1 }}>
            <Typography variant='h6'>Daily Stats</Typography>
            <Button variant='contained' onClick={fetchDailyStats} disabled={isLoading}>
              Fetch
            </Button>
          </Stack>

          {isLoading && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {errorMessage && (
            <Alert severity='error' sx={{ mt: 1 }}>
              <AlertTitle>Error</AlertTitle>
              {errorMessage}
            </Alert>
          )}

          {stats && !isLoading && (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>ISIN</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Market</TableCell>
                    <TableCell align='right'>Nominal Value</TableCell>
                    <TableCell>Maturity Day</TableCell>
                    <TableCell align='right'>Interest Rate (%)</TableCell>
                    <TableCell align='right'>Accrued Interest</TableCell>
                    <TableCell>Currency</TableCell>
                    <TableCell align='right'>Closing Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.map((row) => (
                    <TableRow key={`${row.name}-${row.market}`}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.isin}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.market}</TableCell>
                      <TableCell align='right'>{row.nominalValue}</TableCell>
                      <TableCell>{new Date(row.maturityDay).toLocaleDateString()}</TableCell>
                      <TableCell align='right'>{row.currentInterestRate}</TableCell>
                      <TableCell align='right'>{row.accuredInterest}</TableCell>
                      <TableCell>{row.tradingCurrency}</TableCell>
                      <TableCell align='right'>{row.closingPrice}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </>
  );
}
