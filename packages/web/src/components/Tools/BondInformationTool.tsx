import { FormEvent, useState } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { getBondInformation, type ObligacjeBondInformation } from '@/sdk/Bonds';

export default function BondInformationTool(): React.JSX.Element {
  const [bondName, setBondName] = useState('');
  const [bondInformation, setBondInformation] = useState<ObligacjeBondInformation | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function fetchBondInformation(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const requestedBondName = bondName.trim();
    if (!requestedBondName) {
      setErrorMessage('Bond name is required.');
      setBondInformation(undefined);
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    setBondInformation(undefined);
    try {
      setBondInformation(await getBondInformation(requestedBondName));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
    setIsLoading(false);
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant='h6' sx={{ mb: 1 }}>Bond Information</Typography>
      <Box component='form' onSubmit={fetchBondInformation} noValidate>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
          <TextField
            label='Bond name'
            value={bondName}
            onChange={(event) => setBondName(event.target.value)}
            disabled={isLoading}
            required
            fullWidth
          />
          <Button type='submit' variant='contained' disabled={isLoading} sx={{ minWidth: 96 }}>
            Fetch
          </Button>
        </Stack>
      </Box>

      {isLoading && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {errorMessage && (
        <Alert severity='error' sx={{ mt: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {errorMessage}
        </Alert>
      )}

      {bondInformation && !isLoading && (
        <Box sx={{ mt: 2 }}>
          <TableContainer sx={{ mb: 2 }}>
            <Table size='small'>
              <TableBody>
                <TableRow><TableCell>Name</TableCell><TableCell>{bondInformation.name}</TableCell></TableRow>
                <TableRow><TableCell>Issuer</TableCell><TableCell>{bondInformation.issuer}</TableCell></TableRow>
                <TableRow><TableCell>Market</TableCell><TableCell>{bondInformation.market}</TableCell></TableRow>
                <TableRow><TableCell>Issue Value</TableCell><TableCell>{bondInformation.issueValue} {bondInformation.currency}</TableCell></TableRow>
                <TableRow><TableCell>Nominal Value</TableCell><TableCell>{bondInformation.nominalValue} {bondInformation.currency}</TableCell></TableRow>
                <TableRow><TableCell>Interest Type</TableCell><TableCell>{bondInformation.interestType}</TableCell></TableRow>
                <TableRow><TableCell>Currency</TableCell><TableCell>{bondInformation.currency}</TableCell></TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant='subtitle1' sx={{ mb: 1 }}>Interest Periods</Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>First Day</TableCell>
                  <TableCell>Rights Day</TableCell>
                  <TableCell>Payoff Day</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bondInformation.interestPeriods.map((period) => (
                  <TableRow key={`${period.firstDay}-${period.rightsDay}-${period.payoffDay}`}>
                    <TableCell>{period.firstDay}</TableCell>
                    <TableCell>{period.rightsDay}</TableCell>
                    <TableCell>{period.payoffDay}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  );
}