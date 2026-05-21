import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getIssuerAnalysis, type AgentEvent } from '@/sdk/Issuers';

type AnalysisReportModalProps = {
  issuerName: string;
  open: boolean;
  onClose: () => void;
};

function AgentLogs({ events }: { events: AgentEvent[] }): React.JSX.Element {
  if (events.length === 0) {
    return <Typography color='text.secondary'>No agent log available.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.map((event, idx) => {
        if (event.type === 'tool_use') {
          return (
            <Box key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip label={`#${event.iteration}`} size='small' color='primary' variant='outlined' />
                <Chip label='tool_use' size='small' />
                <Typography variant='subtitle2' fontWeight='bold'>{event.toolName}</Typography>
              </Box>
              <Box component='pre' sx={{ m: 0, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(event.input, null, 2)}
              </Box>
            </Box>
          );
        }

        if (event.type === 'tool_result') {
          return (
            <Box key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip label={`#${event.iteration}`} size='small' color='primary' variant='outlined' />
                <Chip label='tool_result' size='small' color={event.isError ? 'error' : 'success'} />
                <Typography variant='subtitle2' fontWeight='bold'>{event.toolName}</Typography>
              </Box>
              <Box component='pre' sx={{ m: 0, p: 1, bgcolor: event.isError ? 'error.50' : 'grey.100', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {event.result}
              </Box>
            </Box>
          );
        }

        if (event.type === 'end_turn') {
          return (
            <Box key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip label={`#${event.iteration}`} size='small' color='primary' variant='outlined' />
                <Chip label='end_turn' size='small' color='info' />
              </Box>
              {event.text && (
                <Box component='pre' sx={{ m: 0, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {event.text}
                </Box>
              )}
            </Box>
          );
        }

        if (event.type === 'usage') {
          return (
            <Box key={idx}>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip label='usage' size='small' variant='outlined' />
                <Typography variant='body2'>
                  Input: <strong>{event.inputTokens.toLocaleString()}</strong> · Output: <strong>{event.outputTokens.toLocaleString()}</strong> · Total: <strong>{event.totalTokens.toLocaleString()}</strong>
                </Typography>
              </Box>
            </Box>
          );
        }

        return null;
      })}
    </Box>
  );
}

export default function AnalysisReportModal({ issuerName, open, onClose }: AnalysisReportModalProps): React.JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [agentLog, setAgentLog] = useState<AgentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setReportMarkdown(null);
    setAgentLog([]);
    setActiveTab(0);
    getIssuerAnalysis(issuerName)
      .then(result => {
        setReportMarkdown(result.reportMarkdown);
        setAgentLog(result.agentLog);
      })
      .catch(() => setError('Failed to load report. Please try again.'))
      .finally(() => setLoading(false));
  }, [open, issuerName]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth='lg'
      fullWidth
      scroll='paper'
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
        {issuerName}
        <IconButton size='small' onClick={onClose} aria-label='close'>
          <CloseOutlinedIcon />
        </IconButton>
      </DialogTitle>
      <Tabs value={activeTab} onChange={(_, v: number) => setActiveTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label='Report' />
        <Tab label='Agent Logs' />
      </Tabs>
      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 } }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color='error'>{error}</Typography>
        )}
        {!loading && !error && activeTab === 0 && reportMarkdown !== null && (
          <Box sx={{
            '& h1': { mt: 2, mb: 1, fontSize: { xs: '1.3rem', sm: '1.6rem' } },
            '& h2': { mt: 2, mb: 1, fontSize: { xs: '1.1rem', sm: '1.3rem' } },
            '& h3': { mt: 1.5, mb: 0.5, fontSize: { xs: '1rem', sm: '1.1rem' } },
            '& p': { my: 0.5 },
            '& ul, & ol': { pl: 2, my: 0.5 },
            '& pre': { bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto', fontSize: '0.8rem' },
            '& code': { bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5, fontSize: '0.85em' },
            '& table': { borderCollapse: 'collapse', width: '100%', my: 1, display: 'block', overflowX: 'auto' },
            '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 0.75, textAlign: 'left', whiteSpace: 'nowrap' },
            '& th': { bgcolor: 'grey.100', fontWeight: 'bold' },
            '& tr:nth-of-type(even)': { bgcolor: 'grey.50' },
          }}>
            <Markdown remarkPlugins={[remarkGfm]}>{reportMarkdown}</Markdown>
          </Box>
        )}
        {!loading && !error && activeTab === 1 && (
          <AgentLogs events={agentLog} />
        )}
      </DialogContent>
    </Dialog>
  );
}

