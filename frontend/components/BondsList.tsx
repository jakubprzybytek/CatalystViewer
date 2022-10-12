import BondCard from "./BondCard";
import { BondReport } from "../sdk/GetBonds";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import { BondsStatistics } from '../common/BondsStatistics';

type BondsListParam = {
  bondReports: BondReport[];
  bondsStatistics: BondsStatistics;
}

export default function BondsList({ bondReports, bondsStatistics }: BondsListParam): JSX.Element {
  return (
    <Box>
      <Grid container spacing={1}>
        {bondReports.slice(0, 20).map((bondReportr) => (
          <Grid key={`${bondReportr.details.name}#${bondReportr.details.market}`} item xs={12} sm={6} lg={4} xl={3}>
            <BondCard bondReport={bondReportr} bondsStatistics={bondsStatistics} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}