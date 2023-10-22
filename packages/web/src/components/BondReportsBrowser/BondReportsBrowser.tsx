import Box from "@mui/material/Box";
import { BondReport } from "@/sdk/GetBonds";

type BondReportsBrowserParam = {
  bondReports: BondReport[];
}

export default function BondReportsBrowser(/*{ bondReports }: BondReportsBrowserParam*/): JSX.Element {
  return (
    <Box>
      Bond Reports Browser
    </Box>
  );
}