import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { FundamentalScorecard, DimensionResult } from '@/bonds/fundamentals/scorecard';
import { CardEntry } from '@/common/Cards';
import { SignalDot } from './SignalDot';

function MetricsList({ dimension }: { dimension: DimensionResult }) {
  return (
    <Stack spacing={0.5} sx={{ pt: 0.5 }}>
      {dimension.metrics.map(m => (
        <Stack key={m.name} direction='row' spacing={1} alignItems='center'>
          <SignalDot signal={m.signal} />
          <Typography variant='caption'>{m.name}: {m.formattedValue}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

type IssuerScorecardProps = {
  scorecard: FundamentalScorecard;
};

export default function IssuerScorecard({ scorecard }: IssuerScorecardProps): React.JSX.Element {
  const [selectedDimension, setSelectedDimension] = useState<DimensionResult | null>(null);
  const isHoverDevice = useMediaQuery('(hover: hover) and (pointer: fine)');

  if (scorecard.dimensions.length === 0) {
    return <Typography variant='caption' sx={{ color: 'text.disabled' }}>No financial data</Typography>;
  }

  return (
    <>
      <CardEntry caption='Fundamental Analysis'>
        <Grid container columns={3}>
          {scorecard.dimensions.map(d => {
            const cell = (
              <Stack
                alignItems='center'
                onClick={!isHoverDevice ? () => setSelectedDimension(d) : undefined}
                sx={{
                  cursor: isHoverDevice ? 'default' : 'pointer',
                  py: 0.75,
                  px: 0.5,
                  mx: 0.25,
                  my: 0.25,
                  borderRadius: 2,
                  backgroundColor: 'var(--cv-bg-card)',
                  border: '1px solid var(--cv-border-soft)',
                }}
              >
                <Typography variant='caption' sx={{ color: 'text.secondary', textAlign: 'center', lineHeight: 1.2, fontSize: '0.65rem' }}>
                  {d.name}
                </Typography>
                <SignalDot signal={d.signal} size='lg' />
              </Stack>
            );

            return (
              <Grid key={d.name} size={1}>
                {isHoverDevice ? (
                  <Tooltip title={<MetricsList dimension={d} />} placement='top' arrow>
                    {cell}
                  </Tooltip>
                ) : cell}
              </Grid>
            );
          })}
        </Grid>
      </CardEntry>
      <Dialog
        open={!!selectedDimension}
        onClose={() => setSelectedDimension(null)}
        maxWidth='xs'
      >
        {selectedDimension && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pr: 1, borderBottom: '1px solid var(--cv-border-soft)' }}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <SignalDot signal={selectedDimension.signal} size='lg' />
                <Typography variant='h6' sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>{selectedDimension.name}</Typography>
              </Stack>
              <IconButton size='small' onClick={() => setSelectedDimension(null)}>
                <CloseIcon fontSize='small' />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <MetricsList dimension={selectedDimension} />
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
}
