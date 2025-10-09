import { styled } from '@mui/material';
import Grid from '@mui/material/Grid';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import Link from "@mui/material/Link";
import BondCardYTMSection from './BondCardYTMSection';
import { interestBaseType, InterestPercentilesByInterestBaseType } from "@bonds/statistics";
import { BondReport } from "@sdk/Bonds";
import { formatCompactCurrency, formatCurrency, formatDate } from '@/common/Formats';
import { CardEntry, CardValue } from '@/common/Cards/CardEntry';
import { CardSectionRow } from '@/common/Cards/CardSectionRow';
import { getInterestConstColorCode } from '@/bonds/BondIndicators';
import { ColorCode } from '@/common/ColorCodes';

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  flexGrow: 1,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
  }
}));

type BondCardParam = {
  bondReport: BondReport;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function NewBondCard({ bondReport, statistics }: BondCardParam): JSX.Element {
  const { details, currentValues } = bondReport;

  const interestConstColorCode = getInterestConstColorCode(details.interestConst, statistics[interestBaseType(bondReport)]);
  const interestBarColor = new Date().getTime() >= currentValues.interestRecordDay ? 'success' : 'error';
  const tradingDaysColorCode: ColorCode = currentValues.tradingDaysRatio > 0.75 ? 'green' : currentValues.tradingDaysRatio > 0.5 ? 'yellow' : currentValues.tradingDaysRatio > 0.25 ? 'orange' : 'red';

  return (
    <Paper variant="outlined">
      <Grid container width='100%'>
        <Grid className='card-section' size={{ xs: 12, md: 4 }}>
          <CardSectionRow>
            <Typography variant='h6'><Link href={`https://obligacje.pl/pl/obligacja/${details.name}`} target='_blank'>{details.name}</Link></Typography>
            <CardEntry caption='Interest Type' textAlign='end'>
              <CardValue colorCode={interestConstColorCode}>
                {details.interestVariable && `${details.interestVariable} + `}{details.interestConst}%
              </CardValue>
            </CardEntry>
          </CardSectionRow>
          <CardSectionRow>
            <CardEntry caption='Issuer'>
              <CardValue bold>{details.issuer}</CardValue>
            </CardEntry>
            <CardEntry caption='Market' textAlign='end'>{details.market}</CardEntry>
          </CardSectionRow>
        </Grid>
        <Grid className='card-section' size={{ xs: 12, md: 4 }}>
          <CardSectionRow>
            <CardEntry caption='Interest progress' flexGrow={1}>
              <CardValue>
                <BorderLinearProgress variant='determinate' color={interestBarColor} value={currentValues.interestProgress} />
              </CardValue>
            </CardEntry>
          </CardSectionRow>
          <CardSectionRow>
            <CardEntry caption='Record day'>
              <CardValue bold>{formatDate(currentValues.interestRecordDay)}</CardValue>
            </CardEntry>
            <CardEntry caption='Payable'>
              <CardValue>{formatDate(currentValues.interestPayableDay)}</CardValue>
            </CardEntry>
          </CardSectionRow>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <CardSectionRow>
            {/* {liquidityReport && <BondLiquidityDialog bondReport={liquidityReport} onClose={() => setLiquidityReport(undefined)} />} */}
            <CardEntry caption='Avg turnover' width='25%'>
              <CardValue>{!!currentValues.averageTurnover ? formatCompactCurrency(currentValues.averageTurnover * 1000, details.currency) : 'N/A'}</CardValue>
            </CardEntry>
            <CardEntry caption='Trading ratio' textAlign='center' width='25%'>
              <CardValue colorCode={tradingDaysColorCode}>{Math.round(currentValues.tradingDaysRatio * 100)}%</CardValue>
            </CardEntry>
            <CardEntry caption='Avg spread' textAlign='end' width='25%'>
              <CardValue>{!!currentValues.averageSpread ? formatCurrency(currentValues.averageSpread, details.currency) : 'N/A'}</CardValue>
            </CardEntry>
            {/* <Button variant='outlined' size='small' sx={{ textTransform: 'none', ml: 2 }} onClick={() => setLiquidityReport(bondReport)}>
              More
            </Button> */}
          </CardSectionRow>
          {bondReport.lastPrice && <BondCardYTMSection title='Last price (date/time)' bondReport={bondReport} price={bondReport.lastPrice} secondary={bondReport.lastDateTime} />}
        </Grid>
      </Grid>
    </Paper>
  );
}
