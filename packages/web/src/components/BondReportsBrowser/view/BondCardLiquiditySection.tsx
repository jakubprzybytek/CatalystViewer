import { useState } from 'react';
import Button from '@mui/material/Button';
import { BondReport } from '@/sdk/Bonds';
import { CardSection, CardEntry, CardValue } from '@/common/Cards';
import { formatCompactCurrency, formatCurrency } from '@/common/Formats';
import BondLiquidityDialog from './BondLiquidityDialog';

type BondCardLiquiditySectionParams = {
  bondReport: BondReport;
}

export default function BondCardLiquiditySection({ bondReport }: BondCardLiquiditySectionParams): JSX.Element {
  const { currentValues, details } = bondReport;
  const [liquidityReport, setLiquidityReport] = useState<BondReport | undefined>(undefined);

  return (
    <CardSection>
      {liquidityReport && <BondLiquidityDialog bondReport={liquidityReport} onClose={() => setLiquidityReport(undefined)} />}
      <CardEntry caption='Avg turnover' width='25%'>
        <CardValue>{!!currentValues.averageTurnover ? formatCompactCurrency(currentValues.averageTurnover * 1000, details.currency) : 'N/A'}</CardValue>
      </CardEntry>
      <CardEntry caption='Trading ratio' textAlign='center' width='25%'>
        <CardValue>{Math.round(currentValues.tradingDaysRatio * 100)}%</CardValue>
      </CardEntry>
      <CardEntry caption='Avg spread' textAlign='end' width='25%'>
        <CardValue>{!!currentValues.averageSpread ? formatCurrency(currentValues.averageSpread, details.currency) : 'N/A'}</CardValue>
      </CardEntry>
      <Button variant='outlined' size='small' sx={{ textTransform: 'none', ml: 2 }} onClick={() => setLiquidityReport(bondReport)}>
        More
      </Button>
    </CardSection>
  );
}
