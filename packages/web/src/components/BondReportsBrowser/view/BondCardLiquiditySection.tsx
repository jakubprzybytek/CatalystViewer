import { useState } from 'react';
import Button from '@mui/material/Button';
import { BondReport } from '@/sdk/Bonds';
import { CardSection, CardEntry, CardValue } from '@/common/Cards';
import { formatCompactCurrency, formatCurrency } from '@/common/Formats';
import BondLiquidityDialog from './BondLiquidityDialog';

type BondCardLiquiditySectionParams = {
  bondReport: BondReport;
}

export default function BondCardLiquiditySection({ bondReport: { currentValues, details } }: BondCardLiquiditySectionParams): JSX.Element {
  const [liquidityReport, setLiquidityReport] = useState<string | undefined>(undefined);

  return (
    <CardSection>
      {liquidityReport && <BondLiquidityDialog bondDetails={details} onClose={() => setLiquidityReport(undefined)} />}
      <CardEntry caption='Avg turnover' width='33%'>
        <CardValue>{!!currentValues.averageTurnover ? formatCompactCurrency(currentValues.averageTurnover * 1000, details.currency) : 'N/A'}</CardValue>
      </CardEntry>
      <CardEntry caption='Trading days ratio' textAlign='center' width='33%'>
        <CardValue>{currentValues.tradingDaysRatio * 100}%</CardValue>
      </CardEntry>
      <CardEntry caption='Avg spread' textAlign='end' width='33%'>
        <CardValue>{!!currentValues.averageSpread ? formatCurrency(currentValues.averageSpread, details.currency) : 'N/A'}</CardValue>
      </CardEntry>
      <Button size='small' sx={{ textTransform: 'none' }} onClick={() => setLiquidityReport('jeje')}>
        More
      </Button>
    </CardSection>
  );
}
