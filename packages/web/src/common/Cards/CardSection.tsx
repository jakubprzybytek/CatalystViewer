import Stack from "@mui/material/Stack";

type CardSectionParam = {
  children: React.ReactNode;
}

export function CardSection({ children }: CardSectionParam): JSX.Element {
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
