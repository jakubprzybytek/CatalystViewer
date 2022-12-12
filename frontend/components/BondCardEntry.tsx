import Stack from "@mui/material/Stack";
import { Variant } from "@mui/material/styles/createTypography";
import Typography from "@mui/material/Typography";
import { Box } from "@mui/system";

export type Color = 'lightpink' | 'orange' | 'yellow' | 'lightgreen' | 'none';

type BondCardEntryParam = {
  caption: string;
  width?: string;
  variant?: Variant;
  textAlign?: 'left' | 'center' | 'end';
  colorCode?: Color;
  children: React.ReactNode;
  secondary?: string;
}

export function BondCardEntry({ caption, width, variant = 'body1', textAlign = 'left', colorCode, children, secondary }: BondCardEntryParam): JSX.Element {
  return (
    <Stack sx={{
      '& > span': { textAlign },
      ...(width && { width })
    }}>
      <Typography component='span' variant='caption'>{caption}</Typography>
      {colorCode && colorCode !== 'none' ?
        <Box component='span'><Typography component='span' variant={variant} sx={{ backgroundColor: colorCode, p: '1px 3px 1px 3px' }}>{children}</Typography></Box>
        : <Typography component='span' variant={variant}>{children}</Typography>}
      {secondary && <Typography component='span' variant='subtitle2'>{secondary}</Typography>}
    </Stack>
  );
}
