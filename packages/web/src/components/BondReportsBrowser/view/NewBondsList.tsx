import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import NewBondCard from "./NewBondCard";
import { BondReport } from "@/sdk/Bonds";
import { InterestPercentilesByInterestBaseType } from '@bonds/statistics';

const BATCH_SIZE = 20;

type BondsListParam = {
  bondReports: BondReport[];
  statistics: InterestPercentilesByInterestBaseType;
}

export default function BondsList({ bondReports, statistics }: BondsListParam): JSX.Element {
  const [displayedItemsCount, setDisplayedItemsCount] = useState(BATCH_SIZE);

  useEffect(() => setDisplayedItemsCount(BATCH_SIZE), [bondReports]);

  return (
    <Grid container padding={1} spacing={0.75}>
      {bondReports.slice(0, displayedItemsCount).map(bondReport => (
        <Grid key={`${bondReport.details.name}#${bondReport.details.market}`} size={{ xs: 12, sm: 6, md: 12 }}>
          <NewBondCard bondReport={bondReport} statistics={statistics} />
        </Grid>
      ))
      }
      {
        displayedItemsCount < bondReports.length &&
        <Grid>
          <Button variant='outlined'
            onClick={() => setDisplayedItemsCount(displayedItemsCount + BATCH_SIZE)}>
            Load more
          </Button>
        </Grid>
      }
    </Grid >
  );
}