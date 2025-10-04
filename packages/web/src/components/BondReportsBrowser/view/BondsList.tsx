import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import BondCard from "./BondCard";
import { BondReport } from "@/sdk/Bonds";
import { InterestPercentilesByInterestBaseType } from '../../../bonds/statistics';

const BATCH_SIZE = 20;

type BondsListParam = {
  bondReports: BondReport[];
  statistics: InterestPercentilesByInterestBaseType;
}

export default function BondsList({ bondReports, statistics }: BondsListParam): JSX.Element {
  const [displayedItemsCount, setDisplayedItemsCount] = useState(BATCH_SIZE);

  useEffect(() => setDisplayedItemsCount(BATCH_SIZE), [bondReports]);

  return (
    <Box>
      <Grid container spacing={1}>
        {bondReports.slice(0, displayedItemsCount).map(bondReport => (
          <Grid key={`${bondReport.details.name}#${bondReport.details.market}`} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
            <BondCard bondReport={bondReport} statistics={statistics} />
          </Grid>
        ))}
        {displayedItemsCount < bondReports.length &&
          <Grid container size={12} justifyContent='center'>
            <Button variant='outlined'
              onClick={() => setDisplayedItemsCount(displayedItemsCount + BATCH_SIZE)}>
              Load more
            </Button>
          </Grid>}
      </Grid>
    </Box>
  );
}