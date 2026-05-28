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
  const pastDotColor = `${color}.dark`;
  const futureDotColor = (theme: import('@mui/material').Theme) => alpha(theme.palette[color].main, 0.38);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {pastPeriods > 5
        ? <>
            <Box sx={{ ...DOT_SX, bgcolor: pastDotColor }} />
            <Box sx={{ ...DOT_SX, bgcolor: pastDotColor }} />
            <Typography component='span' sx={{ ...ELLIPSIS_SX, color: pastDotColor }}>⋯</Typography>
            <Box sx={{ ...DOT_SX, bgcolor: pastDotColor }} />
            <Box sx={{ ...DOT_SX, bgcolor: pastDotColor }} />
          </>
        : Array.from({ length: pastPeriods }).map((_, i) => (
            <Box key={i} sx={{ ...DOT_SX, bgcolor: pastDotColor }} />
          ))
      }
      <BorderLinearProgress variant='determinate' color={color} value={progress} />
      {futurePeriods > 5
        ? <>
            <Box sx={{ ...DOT_SX, bgcolor: futureDotColor }} />
            <Box sx={{ ...DOT_SX, bgcolor: futureDotColor }} />
            <Typography component='span' sx={{ ...ELLIPSIS_SX, color: futureDotColor }}>⋯</Typography>
            <Box sx={{ ...DOT_SX, bgcolor: futureDotColor }} />
            <Box sx={{ ...DOT_SX, bgcolor: futureDotColor }} />
          </>
        : Array.from({ length: futurePeriods }).map((_, i) => (
            <Box key={i} sx={{ ...DOT_SX, bgcolor: futureDotColor }} />
          ))
      }
    </Box>
  );
}
