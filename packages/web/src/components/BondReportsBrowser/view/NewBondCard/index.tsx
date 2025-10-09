import { styled } from '@mui/material';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from "@mui/material/Paper";
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from "@mui/material/Typography";
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import Link from "@mui/material/Link";
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import BondCardYTMSection from './BondCardYTMSection';
import BondLiquidityDialog from '../BondLiquidityDialog';
import { interestBaseType, InterestPercentilesByInterestBaseType } from "@bonds/statistics";
import { BondReport } from "@sdk/Bonds";
import { formatCompactCurrency, formatCurrency, formatDate } from '@/common/Formats';
import { CardEntry, CardValue } from '@/common/Cards/CardEntry';
import { CardSectionRow } from '@/common/Cards/CardSectionRow';
import { getInterestConstColorCode, getNominalValueColorCode } from '@/bonds/BondIndicators';
import { ColorCode } from '@/common/ColorCodes';
import { useState } from 'react';

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

  const [expanded, setExpanded] = useState(false);
  const [liquidityReport, setLiquidityReport] = useState<BondReport | undefined>(undefined);

  const interestConstColorCode = getInterestConstColorCode(details.interestConst, statistics[interestBaseType(bondReport)]);
  const nominalValueColorCode = getNominalValueColorCode(details.nominalValue);
  const interestBarColor = new Date().getTime() >= currentValues.interestRecordDay ? 'success' : 'error';
  const accuredInterestColorCode: ColorCode = currentValues.accuredInterest == 0 ? 'green' : 'none';
  const tradingDaysColorCode: ColorCode = currentValues.tradingDaysRatio > 0.75 ? 'green' : currentValues.tradingDaysRatio > 0.5 ? 'yellow' : currentValues.tradingDaysRatio > 0.25 ? 'orange' : 'red';

  return (
    <Paper className='bond-card' variant="outlined">
      <Grid container width='100%'>
        <Grid className='card-section' size={{ xs: 12, md: 4 }}>
          <CardSectionRow>
            <Typography variant='h6'><Link href={`https://obligacje.pl/pl/obligacja/${details.name}`} target='_blank'>{details.name}</Link></Typography>
            <IconButton size='small' onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />}
            </IconButton>
          </CardSectionRow>
          <CardSectionRow>
            <CardEntry caption='Issuer'>
              <CardValue bold>{details.issuer}</CardValue>
            </CardEntry>
            <CardEntry caption='Interest Type' textAlign='end'>
              <CardValue colorCode={interestConstColorCode}>
                {details.interestVariable && `${details.interestVariable} + `}{details.interestConst}%
              </CardValue>
            </CardEntry>
          </CardSectionRow>
          <Collapse in={expanded}>
            <CardSectionRow>
              <CardEntry caption='Market'>{details.market}</CardEntry>
              <CardEntry caption='Issue Value' textAlign='center'>
                <CardValue colorCode='white'>{details.issueValue > 0 ? formatCompactCurrency(details.issueValue, details.currency) : 'n/a'}</CardValue>
              </CardEntry>
              <CardEntry caption='Nominal value' textAlign='end'>
                <CardValue colorCode={nominalValueColorCode}>
                  {formatCurrency(details.nominalValue, details.currency)}
                </CardValue>
              </CardEntry>
            </CardSectionRow>
            <CardSectionRow>
              <CardEntry caption='First day'>
                <CardValue>{formatDate(details.firstDayTs)}</CardValue>
              </CardEntry>
              <CardEntry caption='Maturity day' textAlign='center'>
                <CardValue>{formatDate(details.maturityDayTs)}</CardValue>
              </CardEntry>
              <CardEntry caption='To maturity' textAlign='end'>
                <CardValue>{currentValues.yearsToMaturity.toFixed(2)} yrs</CardValue>
              </CardEntry>
            </CardSectionRow>
          </Collapse>
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
            <Box hidden={!expanded}>
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
          </CardSectionRow>
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
        <Grid size={{ xs: 12, md: 4 }}>
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
            <Collapse in={expanded} orientation='horizontal'>
              <Button variant='outlined' size='small' sx={{ textTransform: 'none', ml: 2 }} onClick={() => setLiquidityReport(bondReport)}>
                More
              </Button>
            </Collapse>
          </CardSectionRow>
          {bondReport.lastPrice && <BondCardYTMSection title='Last price (date/time)' bondReport={bondReport} price={bondReport.lastPrice} secondary={bondReport.lastDateTime} />}
          <Collapse in={expanded}>
            {bondReport.bidPrice && <BondCardYTMSection title='Bid price (vol, cnt)' bondReport={bondReport} price={bondReport.bidPrice} secondary={`${bondReport.bidVolume}, ${bondReport.bidCount}`} />}
            {bondReport.askPrice && <BondCardYTMSection title='Ask price (vol, cnt)' bondReport={bondReport} price={bondReport.askPrice} secondary={`${bondReport.askVolume}, ${bondReport.askCount}`} />}
          </Collapse>
        </Grid>
      </Grid>
    </Paper>
  );
}
