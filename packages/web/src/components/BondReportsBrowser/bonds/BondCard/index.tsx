import Grid from '@mui/material/Grid';
import Paper from "@mui/material/Paper";
import { InterestPercentilesByInterestBaseType } from "@bonds/statistics";
import { BondReport } from "@sdk/Bonds";
import { useState } from 'react';
import BondCardDetailsSection from './BondCardDetailsSection';
import BondCardInterestSection from './BondCardInterestSection';
import BondCardTradingSection from './BondCardTradingSection';

type BondCardParam = {
  bondReport: BondReport;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function BondCard({ bondReport, statistics }: BondCardParam): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => setExpanded(prev => !prev);

  return (
    <Paper className='bond-card' variant="outlined">
      <Grid container width='100%'>
        <BondCardDetailsSection bondReport={bondReport} statistics={statistics} expanded={expanded} onToggleExpanded={toggleExpanded} />
        <BondCardInterestSection details={bondReport.details} currentValues={bondReport.currentValues} expanded={expanded} />
        <BondCardTradingSection bondReport={bondReport} expanded={expanded} onToggleExpanded={toggleExpanded} />
      </Grid>
    </Paper>
  );
}
