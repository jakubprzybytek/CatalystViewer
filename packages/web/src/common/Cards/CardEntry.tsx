import Stack from "@mui/material/Stack";
import { Variant } from "@mui/material/styles/createTypography";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ColorCode, colorMarkers } from "../ColorCodes";

type BondCardEntryParam = {
  caption: string;
  width?: string;
  variant?: Variant;
  textAlign?: 'left' | 'center' | 'end';
  colorCode?: ColorCode;
  children: React.ReactNode;
  secondary?: string;
}

export function CardEntry({ caption, width, textAlign = 'left', children }: BondCardEntryParam): JSX.Element {
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

type CardValueParam = {
  colorCode?: ColorCode;
  bold?: boolean;
  children: React.ReactNode;
}

export function CardValue({ colorCode = 'none', bold = false, children }: CardValueParam): JSX.Element {
  const colorMarker = colorMarkers[colorCode];
  const fontWeight = bold ? 500 : 400;

  if (colorMarker === undefined) {
    return (
      <Typography component='span' variant='body1' fontWeight={fontWeight} >{children}</Typography>
    );
  }

  return (
    <Box component='span'>
      <Typography component='span' variant='body1' sx={{
        color: colorMarker.color,
        fontWeight,
        backgroundColor: colorMarker.backgroundColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: colorMarker.color,
        borderRadius: 1,
        p: '0px 2px 0px 2px'
      }}>{children}</Typography>
    </Box>
  );
}
