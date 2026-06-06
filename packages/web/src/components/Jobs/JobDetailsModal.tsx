import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { GetJobResult } from '@/sdk/Jobs';

type JobDetailsModalProps = {
  open: boolean;
  job?: GetJobResult;
  isLoading: boolean;
  now: number;
  onClose: () => void;
};

function renderJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
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

function getJobDurationMs(job: GetJobResult, now: number): number {
  if (job.status === 'RUNNING') {
    return now - job.startedAtTs;
  }
  return job.durationMs ?? 0;
}

function toExecutionConsoleUrl(executionArn: string): string | undefined {
  const region = executionArn.split(':')[3];
  if (!region) {
    return undefined;
  }

  const encodedArn = encodeURIComponent(executionArn);
  return `https://${region}.console.aws.amazon.com/states/home?region=${region}#/executions/details/${encodedArn}`;
}

const accordionSx = {
  m: 0,
  borderRadius: 0,
  boxShadow: 'none',
  '&.Mui-expanded': {
    m: 0,
  },
};

const preSx = {
  m: 0,
  overflowX: 'auto',
  whiteSpace: 'pre',
  fontFamily: 'monospace',
  fontSize: '0.875rem',
};

export default function JobDetailsModal({ open, job, isLoading, now, onClose }: JobDetailsModalProps): React.JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const executionUrl = job ? toExecutionConsoleUrl(job.executionArn) : undefined;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md' fullScreen={isMobile}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
        <Typography variant='h6'>Job Details</Typography>
        <IconButton edge='end' aria-label='close job details' onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <DialogContent>
        {isLoading && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {job && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography component='div'><strong>Workflow:</strong> {job.workflowType}</Typography>
              <Typography component='div'><strong>Status:</strong> {job.status}</Typography>
              {executionUrl && (
                <Typography component='div'>
                  <strong>Execution ARN:</strong> <Link href={executionUrl} target='_blank' rel='noopener noreferrer'>link</Link>
                </Typography>
              )}
              <Typography component='div'><strong>Started:</strong> {new Date(job.startedAtTs).toLocaleString()}</Typography>
              <Typography component='div'><strong>Ended:</strong> {job.endedAtTs ? new Date(job.endedAtTs).toLocaleString() : '—'}</Typography>
              <Typography component='div'><strong>Duration:</strong> {formatDuration(getJobDurationMs(job, now))}</Typography>
            </Box>
            <Accordion disableGutters square sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                Input Summary
              </AccordionSummary>
              <AccordionDetails>
                <Box component='pre' sx={preSx}>{renderJson(job.inputSummary)}</Box>
              </AccordionDetails>
            </Accordion>
            <Accordion defaultExpanded disableGutters square sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                Output Summary
              </AccordionSummary>
              <AccordionDetails>
                <Box component='pre' sx={preSx}>{renderJson(job.outputSummary)}</Box>
              </AccordionDetails>
            </Accordion>
            <Accordion disableGutters square sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                Error Summary
              </AccordionSummary>
              <AccordionDetails>
                <Box component='pre' sx={preSx}>{renderJson(job.errorSummary)}</Box>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
