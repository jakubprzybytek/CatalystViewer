import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Box } from "@mui/system";

export type Colors = 'lightpink' | 'orange' | 'yellow' | 'lightgreen';

type BondCardEntryParam = {
  caption: string;
  textAlign?: 'left' | 'center' | 'end';
  colorCode?: 'none' | Colors;
  children: React.ReactNode;
  secondary?: string;
}

export function BondCardEntry({ caption, textAlign = 'left', colorCode, children, secondary }: BondCardEntryParam): JSX.Element {
  return (
    <Stack sx={{
      '& > span': { textAlign }
    }}>
      <Typography component='span' variant='caption'>{caption}</Typography>
      <Stack direction='row'>
        {colorCode && colorCode !== 'none' ?
          <Box component='span'><Typography component='span' sx={{ backgroundColor: colorCode, p: '1px 3px 1px 3px' }}>{children}</Typography></Box>
          : <Typography component='span'>{children}</Typography>}
        {secondary && <Typography component='span' variant='subtitle2'>{secondary}</Typography>}
      </Stack>
    </Stack>
  );
}
