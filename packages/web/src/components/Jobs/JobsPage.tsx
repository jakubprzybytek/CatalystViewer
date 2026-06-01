import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMore from '@mui/icons-material/ExpandMore';
import MainNavigation from '@/components/MainNavigation';
import { getJob, getJobs, type GetJobResult, type JobStatus } from '@/sdk/Jobs';

const ALL_STATUSES: JobStatus[] = ['RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT'];

function renderJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

export default function JobsPage(): React.JSX.Element {
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [items, setItems] = useState<GetJobResult[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [selectedJob, setSelectedJob] = useState<GetJobResult | undefined>(undefined);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const title = useMemo(() => `${items.length} jobs`, [items.length]);

  async function loadFirstPage(nextStatuses: JobStatus[]): Promise<void> {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const result = await getJobs({ statuses: nextStatuses, limit: 20 });
      setItems(result.jobs);
      setCursor(result.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setItems([]);
      setCursor(undefined);
    }
    setIsLoading(false);
  }

  async function loadMore(): Promise<void> {
    if (!cursor || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const result = await getJobs({ statuses, limit: 20, cursor });
      setItems(current => [...current, ...result.jobs]);
      setCursor(result.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
    setIsLoading(false);
  }

  async function openDetails(jobId: string): Promise<void> {
    setIsDetailLoading(true);
    setSelectedJob(undefined);
    try {
      const result = await getJob(jobId);
      setSelectedJob(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
    setIsDetailLoading(false);
  }

  useEffect(() => {
    loadFirstPage(statuses);
  }, []);

  return (
    <>
      <MainNavigation title={title}>
        <></>
      </MainNavigation>
      <Box sx={{ height: 48 }} />
      <Box sx={{ mt: 2, px: 2 }}>
        <Stack direction='row' spacing={1} sx={{ mb: 2 }}>
          <ToggleButtonGroup
            size='small'
            value={statuses}
            onChange={(_event, nextValue: JobStatus[]) => {
              const nextStatuses = nextValue ?? [];
              setStatuses(nextStatuses);
              loadFirstPage(nextStatuses);
            }}
          >
            {ALL_STATUSES.map(status => (
              <ToggleButton key={status} value={status}>{status}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button variant='outlined' onClick={() => loadFirstPage(statuses)} disabled={isLoading}>Refresh</Button>
        </Stack>

        {isLoading && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {errorMessage && (
          <Alert severity='error' sx={{ mb: 2 }}>
            <AlertTitle>Cannot fetch jobs</AlertTitle>
            {errorMessage}
          </Alert>
        )}

        <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {items.map(job => (
            <ListItem key={job.jobId} disablePadding divider>
              <ListItemButton onClick={() => openDetails(job.jobId)}>
                <ListItemText
                  primary={`${job.workflowType} • ${new Date(job.startedAtTs).toLocaleString()}`}
                  secondary={`Ended: ${job.endedAt ? new Date(job.endedAtTs ?? 0).toLocaleString() : '—'} • Duration: ${job.durationMs ?? 0}ms`}
                />
                <Chip label={job.status} color={job.status === 'SUCCEEDED' ? 'success' : job.status === 'RUNNING' ? 'info' : 'error'} size='small' />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {cursor && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button variant='outlined' onClick={loadMore} disabled={isLoading}>Load more</Button>
          </Box>
        )}
      </Box>

      <Dialog open={selectedJob !== undefined || isDetailLoading} onClose={() => setSelectedJob(undefined)} fullWidth maxWidth='md'>
        <DialogTitle>Job Details</DialogTitle>
        <DialogContent>
          {isDetailLoading && <CircularProgress />}
          {selectedJob && (
            <>
              <Box sx={{ mb: 2 }}>
                <strong>Workflow:</strong> {selectedJob.workflowType}<br />
                <strong>Status:</strong> {selectedJob.status}<br />
                <strong>Execution ARN:</strong> {selectedJob.executionArn}<br />
                <strong>Started:</strong> {new Date(selectedJob.startedAtTs).toLocaleString()}<br />
                <strong>Ended:</strong> {selectedJob.endedAtTs ? new Date(selectedJob.endedAtTs).toLocaleString() : '—'}
              </Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  Input Summary
                </AccordionSummary>
                <AccordionDetails>
                  <pre>{renderJson(selectedJob.inputSummary)}</pre>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  Output Summary
                </AccordionSummary>
                <AccordionDetails>
                  <pre>{renderJson(selectedJob.outputSummary)}</pre>
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  Error Summary
                </AccordionSummary>
                <AccordionDetails>
                  <pre>{renderJson(selectedJob.errorSummary)}</pre>
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
