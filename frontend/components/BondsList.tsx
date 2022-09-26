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
        <Grid item xs={12} md={6}
          sx={{
            pb: 1,
            pl: 1
          }}>
          <BondCard key={`${bond.details.name}#${bond.details.market}`} bond={bond} />
        </Grid>
      ))}
    </Grid>
  );
}