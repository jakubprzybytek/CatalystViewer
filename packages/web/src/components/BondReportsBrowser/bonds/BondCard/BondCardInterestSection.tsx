import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import { BondCurrentValues, BondDetails } from '@sdk/Bonds';
import { formatCurrency, formatDate } from '@/common/Formats';
import { CardEntry, CardValue } from '@/common/Cards/CardEntry';
import { CardSectionRow } from '@/common/Cards/CardSectionRow';
import { ColorCode } from '@/common/ColorCodes';
import InterestProgressBar from './InterestProgressBar';

type BondCardInterestSectionParam = {
  details: BondDetails;
  currentValues: BondCurrentValues;
  expanded: boolean;
}

export default function BondCardInterestSection({ details, currentValues, expanded }: BondCardInterestSectionParam): React.JSX.Element {
  const interestBarColor = new Date().getTime() >= currentValues.interestRecordDay ? 'success' : 'error';
  const accuredInterestColorCode: ColorCode = currentValues.accuredInterest == 0 ? 'green' : 'none';

  return (
    <Grid className='card-section' size={{ xs: 12, md: 4 }}>
      <CardSectionRow>
        <CardEntry caption='Interest progress' flexGrow={1}>
          <CardValue>
            <InterestProgressBar
              progress={currentValues.interestProgress}
              color={interestBarColor}
              pastPeriods={currentValues.pastInterestPeriods}
              futurePeriods={currentValues.futureInterestPeriods}
            />
          </CardValue>
        </CardEntry>
      </CardSectionRow>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: expanded ? '1fr 1fr 1fr' : '0fr 1fr 1fr',
        transition: 'grid-template-columns 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        p: 1,
        pb: 0,
      }}>
        <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <CardEntry caption='First day'>
            <CardValue>{formatDate(currentValues.interestFirstDay)}</CardValue>
          </CardEntry>
        </Box>
        <CardEntry caption='Record day'>
          <CardValue bold>{formatDate(currentValues.interestRecordDay)}</CardValue>
        </CardEntry>
        <CardEntry caption='Payable'>
          <CardValue>{formatDate(currentValues.interestPayableDay)}</CardValue>
        </CardEntry>
      </Box>
      <Collapse in={expanded}>
        <CardSectionRow>
          <CardEntry caption='Current interest' width='33%'>
            <CardValue bold>{currentValues.interestRate.toFixed(2)}%</CardValue>
          </CardEntry>
          <CardEntry caption='Accured interest' textAlign='center' width='33%'>
            <CardValue colorCode={accuredInterestColorCode}>{formatCurrency(currentValues.accuredInterest, details.currency)}</CardValue>
          </CardEntry>
          <CardEntry caption='Full interest' textAlign='end' width='33%'>
            <CardValue>{formatCurrency(currentValues.periodInterest, details.currency)}</CardValue>
          </CardEntry>
        </CardSectionRow>
      </Collapse>
    </Grid>
  );
}
