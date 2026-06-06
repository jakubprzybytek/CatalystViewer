import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
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
import Refresh from '@mui/icons-material/Refresh';
import MainNavigation from '@/components/MainNavigation';
import { getJob, getJobs, type GetJobResult, type JobStatus } from '@/sdk/Jobs';

type JobFilter = 'success' | 'failed';

const FAILED_STATUSES: JobStatus[] = ['RUNNING', 'FAILED', 'TIMED_OUT'];

function filterToStatuses(filters: JobFilter[]): JobStatus[] {
  const statuses: JobStatus[] = [];
  if (filters.includes('success')) statuses.push('SUCCEEDED');
  if (filters.includes('failed')) statuses.push(...FAILED_STATUSES);
  return statuses;
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)} min`;
  }
  return `${(minutes / 60).toFixed(1)} h`;
}

function renderJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

export default function JobsPage(): React.JSX.Element {
  const [filters, setFilters] = useState<JobFilter[]>([]);
  const [items, setItems] = useState<GetJobResult[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [selectedJob, setSelectedJob] = useState<GetJobResult | undefined>(undefined);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  const title = useMemo(() => `${items.length} jobs`, [items.length]);
  const hasRunningJobs = useMemo(() => items.some(job => job.status === 'RUNNING'), [items]);

  useEffect(() => {
    if (!hasRunningJobs) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunningJobs]);

  function getJobDurationMs(job: GetJobResult): number {
    if (job.status === 'RUNNING') {
      return now - job.startedAtTs;
    }
    return job.durationMs ?? 0;
  }

  async function loadFirstPage(nextFilters: JobFilter[]): Promise<void> {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const result = await getJobs({ statuses: filterToStatuses(nextFilters), limit: 20 });
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
      const result = await getJobs({ statuses: filterToStatuses(filters), limit: 20, cursor });
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
    loadFirstPage(filters);
  }, []);

  return (
    <>
      <MainNavigation title={title}>
        <IconButton color='inherit' onClick={() => loadFirstPage(filters)} disabled={isLoading}>
          <Refresh />
        </IconButton>
      </MainNavigation>
      <Box sx={{ height: 48 }} />
      <Box sx={{ mt: 1, px: 1 }}>
        <Stack direction='row' spacing={1} sx={{ mb: 1 }}>
          <ToggleButtonGroup
            size='small'
            value={filters}
            onChange={(_event, nextValue: JobFilter[]) => {
              const nextFilters = nextValue ?? [];
              setFilters(nextFilters);
              loadFirstPage(nextFilters);
            }}
          >
            <ToggleButton value='success'>Success</ToggleButton>
            <ToggleButton value='failed'>Failed</ToggleButton>
          </ToggleButtonGroup>
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

        <List disablePadding sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
          {items.map(job => (
            <ListItem key={job.jobId} disablePadding divider sx={{ width: '100%' }}>
              <ListItemButton onClick={() => openDetails(job.jobId)} sx={{ width: '100%', py: 0.5 }}>
                <ListItemText
                  primary={
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <span>{job.workflowType}</span>
                      <Chip label={job.status} color={job.status === 'SUCCEEDED' ? 'success' : job.status === 'RUNNING' ? 'info' : 'error'} size='small' />
                    </Stack>
                  }
                  secondary={`${new Date(job.startedAtTs).toLocaleString()} · ${formatDuration(getJobDurationMs(job))}`}
                />
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
