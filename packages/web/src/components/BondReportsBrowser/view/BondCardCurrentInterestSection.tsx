import { styled } from '@mui/material/styles';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import { BondReport } from '@/sdk/GetBonds';
import { formatCurrency, formatDate } from '@/common/Formats';
import { CardSection, CardEntry, CardValue } from '@/common/Cards';
import { ColorCode } from '@/common/ColorCodes';
import { Box } from '@mui/material';

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
  },
  // [`& .${linearProgressClasses.bar}`]: {
  //   borderRadius: 5,
  //   backgroundColor: theme.palette.mode === 'light' ? '#1a90ff' : '#308fe8',
  // },
}));

type BondCardCurrentInterestSectionParams = {
  bondReport: BondReport;
}

export default function BondCardCurrentInterestSection({ bondReport: { currentValues, details: { currency } } }: BondCardCurrentInterestSectionParams): JSX.Element {
  const today = new Date();
  const interestBarColor = today.getTime() >= currentValues.interestRecordDay ? 'success' : 'error';

  const accuredInterestColorCode: ColorCode = currentValues.accuredInterest == 0 ? 'green' : 'none';

  return (
    <>
      <CardSection>
        <Box flexGrow={1}>
          <BorderLinearProgress variant='determinate' color={interestBarColor} value={currentValues.interestProgress} />
        </Box>
      </CardSection>
      <CardSection>
        <CardEntry caption='First day' width='33%'>
          <CardValue>{formatDate(currentValues.interestFirstDay)}</CardValue>
        </CardEntry>
        <CardEntry caption='Record day' textAlign='center' width='33%'>
          <CardValue>{formatDate(currentValues.interestRecordDay)}</CardValue>
        </CardEntry>
        <CardEntry caption='Payable' textAlign='end' width='33%'>
          <CardValue>{formatDate(currentValues.interestPayableDay)}</CardValue>
        </CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Current interest' width='33%'>
          <CardValue variant='h6'>{currentValues.interestRate.toFixed(2)}%</CardValue>
        </CardEntry>
        <CardEntry caption='Accured interest' textAlign='center' width='33%'>
          <CardValue colorCode={accuredInterestColorCode}>{formatCurrency(currentValues.accuredInterest, currency)}</CardValue>
        </CardEntry>
        <CardEntry caption='Full interest' textAlign='end' width='33%'>
          <CardValue>{formatCurrency(currentValues.periodInterest, currency)}</CardValue>
        </CardEntry>
      </CardSection>
    </>
  );
}
