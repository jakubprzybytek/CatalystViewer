import Stack from "@mui/material/Stack";
import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { BondReport } from "../sdk/GetBonds";
import { formatCurrency } from "../common/Formats";
import { Box } from "@mui/system";
import { Link } from "@mui/material";
import { BondsStatistics, interestVariablePart } from "../common/BondsStatistics";

type Colors = 'lightpink' | 'orange' | 'yellow' | 'lightgreen';

type BondCardEntryParam = {
  caption: string;
  textAlign?: 'left' | 'center' | 'end';
  colorCode?: 'none' | Colors;
  children: React.ReactNode;
  secondary?: string;
}

function BondCardEntry({ caption, textAlign = 'left', colorCode, children, secondary }: BondCardEntryParam): JSX.Element {
  return (
    <Stack sx={{
      '& > span': { textAlign }
    }}>
      <Typography component='span' variant='caption'>{caption}</Typography>
      {colorCode && colorCode !== 'none' ?
        <Box component='span'><Typography component='span' sx={{ backgroundColor: colorCode, p: '1px 3px 1px 3px' }}>{children}</Typography></Box>
        : <Typography component='span'>{children}</Typography>}
      {secondary && <Typography component='span' variant='subtitle2'>{secondary}</Typography>}
    </Stack>
  );
}

type BondCardSectionParam = {
  children: React.ReactNode;
}

function BondCardSection({ children }: BondCardSectionParam): JSX.Element {
  return (
    <Stack direction='row' sx={{
      p: 1,
      pb: 0,
      justifyContent: 'space-between'
    }}>
      {children}
    </Stack>
  );
}

const colors: Colors[] = ['lightgreen', 'yellow', 'orange', 'lightpink'];

type BondCardParam = {
  bondReport: BondReport;
  bondsStatistics: BondsStatistics;
}

export default function BondCard({ bondReport, bondsStatistics }: BondCardParam): JSX.Element {
  const { details } = bondReport;
  const nominalValueColorCode = details.nominalValue >= 50000 ? 'lightpink' : details.nominalValue >= 10000 ? 'orange' : 'lightgreen';
  const interestConstIndex = bondsStatistics[details.type][interestVariablePart(bondReport)]
    .findIndex((percentile) => bondReport.details.interestConst <= percentile) - 1;
  const interestConstColorCode = colors[Math.max(interestConstIndex, 0)];

  return (
    <>
      <Paper sx={{
        '& .MuiTypography-caption': {
          color: 'gray',
          lineHeight: 1.3
        },
        '& .MuiTypography-subtitle2': {
          color: 'dimgray',
          lineHeight: 1
        },
        '& > hr': {
          paddingTop: 1
        }
      }}>
        <BondCardSection>
          <Typography variant='h4'><Link href={`https://obligacje.pl/pl/obligacja/${bondReport.details.name}`} target='_blank'>{bondReport.details.name}</Link></Typography>
          <BondCardEntry caption='Market' textAlign='end'>{bondReport.details.market}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Issuer'>{bondReport.details.issuer}</BondCardEntry>
          <BondCardEntry caption='Type' textAlign='end'>{bondReport.details.type}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Maturity day'>
            {bondReport.details.maturityDay.toString().substring(0, 10)}
          </BondCardEntry>
          <Divider orientation='vertical' variant='middle' flexItem />
          <BondCardEntry caption='Nominal value' textAlign='center' colorCode={nominalValueColorCode}>
            {formatCurrency(bondReport.details.nominalValue, bondReport.details.currency)}
          </BondCardEntry>
          <Divider orientation='vertical' variant='middle' flexItem />
          <BondCardEntry caption='Interest Type' textAlign='end' colorCode={interestConstColorCode}>
            {bondReport.details.interestVariable && `${bondReport.details.interestVariable} + `}{bondReport.details.interestConst}%
          </BondCardEntry>
        </BondCardSection>
        <Divider />
        <BondCardSection>
          <BondCardEntry caption='Current interest'>{bondReport.details.currentInterestRate.toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Accured interest (since)' textAlign='center'>{formatCurrency(bondReport.details.accuredInterest, bondReport.details.currency)} ({bondReport.currentInterestPeriodFirstDay})</BondCardEntry>
          <BondCardEntry caption='Next interest' textAlign='end'>{bondReport.nextInterestPayoffDay}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Accumulated interest (since)' secondary={`(${bondReport.currentInterestPeriodFirstDay})`} textAlign='left'>
            {formatCurrency(bondReport.accumulatedInterest, bondReport.details.currency)}
          </BondCardEntry>
          <BondCardEntry caption='Accured interest' textAlign='left'>{formatCurrency(bondReport.accuredInterest, bondReport.details.currency)}</BondCardEntry>
          <BondCardEntry caption='Next interest (when)' secondary={`(${bondReport.nextInterestPayoffDay})`} textAlign='end'>
            {formatCurrency(bondReport.nextInterest, bondReport.details.currency)}
          </BondCardEntry>
        </BondCardSection>
        <Divider />
        {!bondReport.lastPrice && bondReport.referencePrice && bondReport.referencePriceNetYtm && bondReport.referencePriceGrossYtm && <BondCardSection>
          <BondCardEntry caption='Reference price'>{bondReport.referencePrice.toFixed(2)}</BondCardEntry>
          <BondCardEntry caption='Reference price YTM (net)' textAlign='center'>{(bondReport.referencePriceNetYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Reference price YTM (gross)' textAlign='end'>{(bondReport.referencePriceGrossYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
        </BondCardSection>}
        {bondReport.lastPrice && bondReport.lastPriceNetYtm && bondReport.lastPriceGrossYtm && <BondCardSection>
          <BondCardEntry caption='Last price (date/time)' secondary={`(${bondReport.lastDateTime})`}>
            {bondReport.lastPrice.toFixed(2)}
          </BondCardEntry>
          <BondCardEntry caption='Last price YTM (net)' textAlign='center'>{(bondReport.lastPriceNetYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Last price YTM (gross)' textAlign='end'>{(bondReport.lastPriceGrossYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
        </BondCardSection>}
        {bondReport.bidPrice && bondReport.bidPriceNetYtm && bondReport.bidPriceGrossYtm && <BondCardSection>
          <BondCardEntry caption='Bid price (V, C)' secondary={`(${bondReport.bidVolume}, ${bondReport.bidCount})`}>
            {bondReport.bidPrice.toFixed(2)}
          </BondCardEntry>
          <BondCardEntry caption='Bid price YTM (net)' textAlign='center'>{(bondReport.bidPriceNetYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Bid price YTM (gross)' textAlign='end'>{(bondReport.bidPriceGrossYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
        </BondCardSection>}
        {bondReport.askPrice && bondReport.askPriceNetYtm && bondReport.askPriceGrossYtm && <BondCardSection>
          <BondCardEntry caption='Ask price (V, C)' secondary={`(${bondReport.askVolume}, ${bondReport.askCount})`}>
            {bondReport.askPrice.toFixed(2)}
          </BondCardEntry>
          <BondCardEntry caption='Ask price YTM (net)' textAlign='center'>{(bondReport.askPriceNetYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Ask price YTM (gross)' textAlign='end'>{(bondReport.askPriceGrossYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
        </BondCardSection>}
        <Typography component='span' sx={{
          display: 'flex',
          justifyContent: 'right',
          pr: 1,
          fontSize: '0.7rem',
          color: 'lightgray'
        }}>Updated on: {bondReport.detailsUpdated}</Typography>
      </Paper>
    </>
  );
}