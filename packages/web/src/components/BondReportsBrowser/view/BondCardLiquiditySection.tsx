import { BondReport } from '@/sdk/Bonds';
import { CardSection, CardEntry, CardValue } from '@/common/Cards';
import { formatCompactCurrency, formatCurrency } from '@/common/Formats';

type BondCardLiquiditySectionParams = {
  bondReport: BondReport;
}

export default function BondCardLiquiditySection({ bondReport: { currentValues, details: { currency } } }: BondCardLiquiditySectionParams): JSX.Element {
  return (
    <CardSection>
      <CardEntry caption='Avg turnover' width='33%'>
        <CardValue>{!!currentValues.averageTurnover ? formatCompactCurrency(currentValues.averageTurnover * 1000, currency) : 'N/A'}</CardValue>
      </CardEntry>
      <CardEntry caption='Trading days ratio' textAlign='center' width='33%'>
        <CardValue>{currentValues.tradingDaysRatio * 100}%</CardValue>
      </CardEntry>
      <CardEntry caption='Avg spread' textAlign='end' width='33%'>
        <CardValue>{!!currentValues.averageSpread ? formatCurrency(currentValues.averageSpread, currency) : 'N/A'}</CardValue>
      </CardEntry>
    </CardSection>
  );
}
