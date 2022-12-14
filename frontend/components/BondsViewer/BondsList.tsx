import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import BondCard from "./BondCard";
import { BondReport } from "../../sdk/GetBonds";
import { BondsStatistics } from '../../bonds/statistics';

const BATCH_SIZE = 20;

type BondsListParam = {
  bondReports: BondReport[];
  bondsStatistics: BondsStatistics;
}

export default function BondsList({ bondReports, bondsStatistics }: BondsListParam): JSX.Element {
  const [displayedItemsCount, setDisplayedItemsCount] = useState(BATCH_SIZE);

  useEffect(() => setDisplayedItemsCount(BATCH_SIZE), [bondReports]);

  return (
    <Box>
      <Grid container spacing={1}>
        {bondReports.slice(0, displayedItemsCount).map((bondReportr) => (
          <Grid key={`${bondReportr.details.name}#${bondReportr.details.market}`} item xs={12} sm={6} lg={4} xl={3}>
            <BondCard bondReport={bondReportr} bondsStatistics={bondsStatistics} />
          </Grid>
        ))}
        {displayedItemsCount < bondReports.length &&
          <Grid item container xs={12} justifyContent='center'>
            <Button variant='outlined'
              onClick={() => setDisplayedItemsCount(displayedItemsCount + BATCH_SIZE)}>
              Load more
            </Button>
          </Grid>}
      </Grid>
    </Box>
  );
}