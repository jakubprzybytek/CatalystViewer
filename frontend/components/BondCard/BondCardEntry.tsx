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

export function BondCardEntry({ caption, width, textAlign = 'left', children }: BondCardEntryParam): JSX.Element {
  return (
    <Stack sx={{
      '& > span': { textAlign },
      ...(width && { width })
    }}>
      <Typography component='span' variant='caption'>{caption}</Typography>
      {children}
    </Stack>
  );
}

type BondCardValueParam = {
  colorCode?: Color;
  variant?: Variant;
  children: React.ReactNode;
}

export function BondCardValue({ variant = 'body1', colorCode = 'none', children }: BondCardValueParam): JSX.Element {

  if (colorCode === 'none') {
    return (
      <Typography component='span' variant={variant}>{children}</Typography>
    );
  }

  return (
    <Box component='span'>
      <Typography component='span' variant={variant} sx={{
        backgroundColor: colorCode,
        borderRadius: 1,
        p: '1px 3px 1px 3px'
      }}>{children}</Typography>
    </Box>
  );
}
