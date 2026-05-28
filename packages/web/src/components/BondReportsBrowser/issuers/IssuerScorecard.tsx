import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import type { FundamentalScorecard, DimensionResult } from '@/bonds/fundamentals/scorecard';
import { SignalDot } from './SignalDot';

function DimensionRow({ dimension }: { dimension: DimensionResult }) {
  const tooltipContent = (
    <Stack spacing={0.5} sx={{ p: 0.5 }}>
      {dimension.metrics.map(m => (
        <Stack key={m.name} direction='row' spacing={1} alignItems='center'>
          <SignalDot signal={m.signal} />
          <Typography variant='caption'>{m.name}: {m.formattedValue}</Typography>
        </Stack>
      ))}
    </Stack>
  );

  return (
    <Tooltip title={tooltipContent} placement='right' arrow>
      <Stack direction='row' spacing={1} alignItems='center' sx={{ cursor: 'default' }}>
        <SignalDot signal={dimension.signal} />
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          {dimension.name}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

type IssuerScorecardProps = {
  scorecard: FundamentalScorecard;
};

export default function IssuerScorecard({ scorecard }: IssuerScorecardProps): React.JSX.Element {
  if (scorecard.dimensions.length === 0) {
    return <Typography variant='caption' sx={{ color: 'text.disabled' }}>No financial data</Typography>;
  }

  return (
    <Box>
      <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
        Fundamental Analysis
      </Typography>
      <Stack spacing={0.5}>
        {scorecard.dimensions.map(d => (
          <DimensionRow key={d.name} dimension={d} />
        ))}
      </Stack>
    </Box>
  );
}
