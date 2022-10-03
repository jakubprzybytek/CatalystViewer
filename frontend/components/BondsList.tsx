import BondCard from "./BondCard";
import { BondReport } from "../sdk/GetBonds";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";

type BondsListParam = {
  bondReports: BondReport[];
}

export default function BondsList({ bondReports }: BondsListParam): JSX.Element {
  return (
    <Box>
      <Grid container spacing={1}>
        {bondReports.map((bond) => (
          <Grid key={`${bond.details.name}#${bond.details.market}`} item xs={12} sm={6} lg={4} xl={3}
            sx={{
            }}>
            <BondCard bond={bond} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}