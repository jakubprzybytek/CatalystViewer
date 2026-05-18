import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import Markdown from 'react-markdown';
import { getIssuerAnalysis } from '@/sdk/Issuers';

type AnalysisReportModalProps = {
  issuerName: string;
  open: boolean;
  onClose: () => void;
};

export default function AnalysisReportModal({ issuerName, open, onClose }: AnalysisReportModalProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setReportMarkdown(null);
    getIssuerAnalysis(issuerName)
      .then(md => setReportMarkdown(md))
      .catch(() => setError('Failed to load report. Please try again.'))
      .finally(() => setLoading(false));
  }, [open, issuerName]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='paper'>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {issuerName}
        <IconButton size='small' onClick={onClose} aria-label='close'>
          <CloseOutlinedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color='error'>{error}</Typography>
        )}
        {reportMarkdown !== null && !loading && (
          <Box sx={{ '& h1,h2,h3': { mt: 2, mb: 1 }, '& p': { my: 0.5 }, '& ul': { pl: 2 } }}>
            <Markdown>{reportMarkdown}</Markdown>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
