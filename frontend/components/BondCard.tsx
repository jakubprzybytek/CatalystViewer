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
}

function BondCardEntry({ caption, textAlign = 'left', colorCode, children }: BondCardEntryParam): JSX.Element {
  return (
    <Stack sx={{
      '& > span': { textAlign: textAlign }
    }}>
      <Typography component='span' variant='caption'>{caption}</Typography>
      {colorCode && colorCode !== 'none' ?
        <Box component='span'><Typography component='span' sx={{ backgroundColor: colorCode, p: '1px 3px 1px 3px' }}>{children}</Typography></Box>
        : <Typography component='span'>{children}</Typography>}
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
          <BondCardEntry caption='Accumulated interest (since)' textAlign='left'>{formatCurrency(bondReport.accumulatedInterest, bondReport.details.currency)} ({bondReport.currentInterestPeriodFirstDay})</BondCardEntry>
          <BondCardEntry caption='Accured interest' textAlign='left'>{formatCurrency(bondReport.accuredInterest, bondReport.details.currency)}</BondCardEntry>
          <BondCardEntry caption='Next interest (when)' textAlign='end'>{formatCurrency(bondReport.nextInterest, bondReport.details.currency)} ({bondReport.nextInterestPayoffDay})</BondCardEntry>
        </BondCardSection>
        <Divider />
        <BondCardSection>
          <BondCardEntry caption='Closing price'>{bondReport.closingPrice.toFixed(2)}</BondCardEntry>
          <BondCardEntry caption='Closing price YTM (net)' textAlign='center'>{(bondReport.closingPriceNetYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Closing price YTM (gross)' textAlign='end'>{(bondReport.closingPriceGrossYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
        </BondCardSection>
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