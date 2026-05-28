import Box from '@mui/material/Box';
import type { Signal } from '@/bonds/fundamentals/scorecard';

export const SIGNAL_COLOR: Record<Signal, string> = {
  green: '#4ade80',   // green-400
  yellow: '#facc15',  // yellow-400
  red: '#f87171',     // red-400
  na: '#cbd5e1',      // slate-300
};

export const SIGNAL_LABEL: Record<Signal, string> = {
  green: '●',
  yellow: '●',
  red: '●',
  na: '○',
};

export function SignalDot({ signal }: { signal: Signal }) {
  return (
    <Box
      component='span'
      sx={{ color: SIGNAL_COLOR[signal], fontSize: '1.1rem', lineHeight: 1 }}
      aria-label={signal}
    >
      {SIGNAL_LABEL[signal]}
    </Box>
  );
}
