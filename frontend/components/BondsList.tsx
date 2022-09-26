import BondCard from "./BondCard";
import { BondReport } from "../sdk/GetBonds";
import { Grid } from "@mui/material";

type BondsListParam = {
  bondReports: BondReport[];
}

export default function BondsList({ bondReports }: BondsListParam): JSX.Element {
  return (
    <Grid container sx={{ pr: 1 }}>
      {bondReports.map((bond) => (
        <Grid key={`${bond.details.name}#${bond.details.market}`} item xs={12} md={6} lg={4} xl={3}
          sx={{
            pb: 1,
            pl: 1
          }}>
          <BondCard bond={bond} />
        </Grid>
      ))}
    </Grid>
  );
}