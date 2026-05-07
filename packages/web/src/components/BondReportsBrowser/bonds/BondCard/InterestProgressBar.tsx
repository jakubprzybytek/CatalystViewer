import { styled, alpha } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  flexGrow: 1,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
  }
}));

const DOT_SX = { width: 10, height: 10, borderRadius: '5px', flexShrink: 0 };
const ELLIPSIS_SX = { fontSize: 16, fontWeight: 700, lineHeight: '10px', flexShrink: 0 };

type InterestProgressBarParam = {
  progress: number;
  color: 'success' | 'error';
  pastPeriods: number;
  futurePeriods: number;
}

export default function InterestProgressBar({ progress, color, pastPeriods, futurePeriods }: InterestProgressBarParam): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {pastPeriods > 5
        ? <>
            <Box sx={{ ...DOT_SX, bgcolor: 'error.main' }} />
            <Box sx={{ ...DOT_SX, bgcolor: 'error.main' }} />
            <Typography component='span' sx={{ ...ELLIPSIS_SX, color: 'error.main' }}>⋯</Typography>
            <Box sx={{ ...DOT_SX, bgcolor: 'error.main' }} />
            <Box sx={{ ...DOT_SX, bgcolor: 'error.main' }} />
          </>
        : Array.from({ length: pastPeriods }).map((_, i) => (
            <Box key={i} sx={{ ...DOT_SX, bgcolor: 'error.main' }} />
          ))
      }
      <BorderLinearProgress variant='determinate' color={color} value={progress} />
      {futurePeriods > 5
        ? <>
            <Box sx={{ ...DOT_SX, bgcolor: (theme) => alpha(theme.palette.error.main, 0.38) }} />
            <Box sx={{ ...DOT_SX, bgcolor: (theme) => alpha(theme.palette.error.main, 0.38) }} />
            <Typography component='span' sx={{ ...ELLIPSIS_SX, color: (theme) => alpha(theme.palette.error.main, 0.38) }}>⋯</Typography>
            <Box sx={{ ...DOT_SX, bgcolor: (theme) => alpha(theme.palette.error.main, 0.38) }} />
            <Box sx={{ ...DOT_SX, bgcolor: (theme) => alpha(theme.palette.error.main, 0.38) }} />
          </>
        : Array.from({ length: futurePeriods }).map((_, i) => (
            <Box key={i} sx={{ ...DOT_SX, bgcolor: (theme) => alpha(theme.palette.error.main, 0.38) }} />
          ))
      }
    </Box>
  );
}
