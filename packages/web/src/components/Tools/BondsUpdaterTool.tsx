import { FormEvent, useState } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { triggerBondsUpdater } from '@/sdk/Bonds';

export default function BondsUpdaterTool(): React.JSX.Element {
  const [updateBonds, setUpdateBonds] = useState(true);
  const [classificationsCap, setClassificationsCap] = useState(10);
  const [forceClassification, setForceClassification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function startBondsUpdater(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setSuccessMessage(undefined);
    setErrorMessage(undefined);

    try {
      await triggerBondsUpdater({ updateBonds, classificationsCap, forceClassification });
      setSuccessMessage('Bonds Update workflow started.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }

    setIsLoading(false);
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant='h6' sx={{ mb: 1 }}>Bonds Updater</Typography>
      <Box component='form' onSubmit={startBondsUpdater} noValidate>
        <Stack spacing={1} sx={{ maxWidth: 420 }}>
          <FormControlLabel
            control={<Switch checked={updateBonds} onChange={(_, checked) => setUpdateBonds(checked)} disabled={isLoading} />}
            label='Update bonds'
          />
          <TextField
            label='Classifications cap'
            type='number'
            value={classificationsCap}
            onChange={(event) => setClassificationsCap(Number(event.target.value))}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            disabled={isLoading}
            required
          />
          <FormControlLabel
            control={<Switch checked={forceClassification} onChange={(_, checked) => setForceClassification(checked)} disabled={isLoading} />}
            label='Force classification'
          />
          <Box>
            <Button type='submit' variant='contained' disabled={isLoading}>
              Start update
            </Button>
          </Box>
        </Stack>
      </Box>

      {isLoading && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {successMessage && (
        <Alert severity='success' sx={{ mt: 2 }}>
          <AlertTitle>Started</AlertTitle>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity='error' sx={{ mt: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {errorMessage}
        </Alert>
      )}
    </Paper>
  );
}