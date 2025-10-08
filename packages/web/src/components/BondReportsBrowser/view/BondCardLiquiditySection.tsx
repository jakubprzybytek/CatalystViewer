import { useState } from 'react';
import Button from '@mui/material/Button';
import { BondReport } from '@/sdk/Bonds';
import { CardSectionRow, CardEntry, CardValue } from '@/common/Cards';
import { formatCompactCurrency, formatCurrency } from '@/common/Formats';
import BondLiquidityDialog from './BondLiquidityDialog';
import { ColorCode } from '@/common/ColorCodes';

type BondCardLiquiditySectionParams = {
  bondReport: BondReport;
}

export default function BondCardLiquiditySection({ bondReport }: BondCardLiquiditySectionParams): JSX.Element {
  const { currentValues, details } = bondReport;
  const [liquidityReport, setLiquidityReport] = useState<BondReport | undefined>(undefined);

  const tradingDaysColorCode: ColorCode = currentValues.tradingDaysRatio > 0.75 ? 'green' : currentValues.tradingDaysRatio > 0.5 ? 'yellow' : currentValues.tradingDaysRatio > 0.25 ? 'orange' : 'red';

  return (
    <CardSectionRow>
      {liquidityReport && <BondLiquidityDialog bondReport={liquidityReport} onClose={() => setLiquidityReport(undefined)} />}
      <CardEntry caption='Avg turnover' width='25%'>
        <CardValue>{!!currentValues.averageTurnover ? formatCompactCurrency(currentValues.averageTurnover * 1000, details.currency) : 'N/A'}</CardValue>
      </CardEntry>
      <CardEntry caption='Trading ratio' textAlign='center' width='25%'>
        <CardValue colorCode={tradingDaysColorCode}>{Math.round(currentValues.tradingDaysRatio * 100)}%</CardValue>
      </CardEntry>
      <CardEntry caption='Avg spread' textAlign='end' width='25%'>
        <CardValue>{!!currentValues.averageSpread ? formatCurrency(currentValues.averageSpread, details.currency) : 'N/A'}</CardValue>
      </CardEntry>
      <Button variant='outlined' size='small' sx={{ textTransform: 'none', ml: 2 }} onClick={() => setLiquidityReport(bondReport)}>
        More
      </Button>
    </CardSectionRow>
  );
}
