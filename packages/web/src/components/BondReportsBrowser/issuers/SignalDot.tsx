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

type SignalDotProps = {
  signal: Signal;
  size?: 'sm' | 'lg';
};

export function SignalDot({ signal, size = 'sm' }: SignalDotProps) {
  return (
    <Box
      component='span'
      sx={{ color: SIGNAL_COLOR[signal], fontSize: size === 'lg' ? '1.75rem' : '1.1rem', lineHeight: 1, verticalAlign: 'middle', display: 'block', mt: 0 }}
      aria-label={signal}
    >
      {SIGNAL_LABEL[signal]}
    </Box>
  );
}
