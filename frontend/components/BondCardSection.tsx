import Stack from "@mui/material/Stack";

type BondCardSectionParam = {
  children: React.ReactNode;
}

export function BondCardSection({ children }: BondCardSectionParam): JSX.Element {
  return (
    <Stack direction='row' sx={{
      p: 1,
      pb: 0,
      justifyContent: 'space-between'
    }}>
      {children}
    </Stack>
  );
}
