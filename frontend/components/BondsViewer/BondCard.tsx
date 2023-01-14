import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { BondReport } from "../../sdk/GetBonds";
import { formatCurrency, formatDate } from '../../common/Formats';
import YTMReportEntry from "./BondCardYTMSection";
import { CardSection, CardEntry, CardValue } from "../Cards";
import { BondsStatistics, interestVariablePart } from "../../bonds/statistics";
import { nominalValueColorCode } from '../../bonds/BondIndicators';
import { ColorCode } from "../../common/ColorCodes";

export const interestConstPartColors: ColorCode[] = ['green', 'yellow', 'orange', 'red'];

type BondCardParam = {
  bondReport: BondReport;
  bondsStatistics: BondsStatistics;
}

type BondReportParam = {
  bondReport: BondReport;
}

function BondCardMainInformationSection({ bondReport, bondsStatistics }: BondCardParam): JSX.Element {
  const { details } = bondReport;
  const interestConstIndex = bondsStatistics.byType[details.type][interestVariablePart(bondReport)]
    .findIndex(percentile => details.interestConst <= percentile) - 1;
  const interestConstColorCode: ColorCode = interestConstPartColors[Math.max(interestConstIndex, 0)];

  return (
    <>
      <CardSection>
        <Typography variant='h4'><Link href={`https://obligacje.pl/pl/obligacja/${details.name}`} target='_blank'>{details.name}</Link></Typography>
        <CardEntry caption='Market' textAlign='end'>{details.market}</CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Issuer'>
          <CardValue variant='h6'>{details.issuer}</CardValue>
        </CardEntry>
        <CardEntry caption='Type' textAlign='end'>{details.type}</CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Maturity day'>
          {details.maturityDay.toString().substring(0, 10)}
        </CardEntry>
        <CardEntry caption='Nominal value' textAlign='center'>
          <CardValue colorCode={nominalValueColorCode(details.nominalValue)}>
            {formatCurrency(details.nominalValue, details.currency)}
          </CardValue>
        </CardEntry>
        <CardEntry caption='Interest Type' textAlign='end'>
          <CardValue colorCode={interestConstColorCode}>
            {details.interestVariable && `${details.interestVariable} + `}{details.interestConst}%
          </CardValue>
        </CardEntry>
      </CardSection>
    </>
  );
}

function BondCardCurrentInterestSection({ bondReport }: BondReportParam): JSX.Element {
  const accuredInterestColorCode: ColorCode = bondReport.currentValues.accuredInterest == 0 ? 'green' : 'none';

  return (
    <>
      <CardSection>
        <CardEntry caption='First day' width='33%'>
          <CardValue>{formatDate(bondReport.currentValues.interestFirstDay)}</CardValue>
        </CardEntry>
        <CardEntry caption='Record day' textAlign="center" width='33%'>
          <CardValue>{formatDate(bondReport.currentValues.interestRecordDay)}</CardValue>
        </CardEntry>
        <CardEntry caption='Payable' textAlign="end" width='33%'>
          <CardValue>{formatDate(bondReport.currentValues.interestPayableDay)}</CardValue>
        </CardEntry>
      </CardSection>
      <CardSection>
        <CardEntry caption='Current interest' width='33%'>
          <CardValue variant='h6'>{bondReport.currentValues.interestRate.toFixed(2)}%</CardValue>
        </CardEntry>
        <CardEntry caption='Accured interest' textAlign="center" width='33%'>
          <CardValue colorCode={accuredInterestColorCode}>{formatCurrency(bondReport.currentValues.accuredInterest, bondReport.details.currency)}</CardValue>
        </CardEntry>
        <CardEntry caption='Full interest' textAlign="end" width='33%'>
          <CardValue>{formatCurrency(bondReport.currentValues.fullInterest, bondReport.details.currency)}</CardValue>
        </CardEntry>
      </CardSection>
    </>
  );
}

export default function BondCard({ bondReport, bondsStatistics }: BondCardParam): JSX.Element {
  return (
    <>
      <Paper sx={{
        '& .MuiTypography-caption': {
          color: 'gray',
          lineHeight: 1.3
        },
        '& .MuiTypography-subtitle2': {
          lineHeight: '24px'
        },
        '& > hr': {
          paddingTop: 1
        }
      }}>
        <BondCardMainInformationSection bondReport={bondReport} bondsStatistics={bondsStatistics} />
        <Divider />
        <BondCardCurrentInterestSection bondReport={bondReport} />
        <Divider />
        {!bondReport.lastPrice && bondReport.referencePrice && <YTMReportEntry title='Reference price' bondReport={bondReport} price={bondReport.referencePrice} />}
        {bondReport.lastPrice && <YTMReportEntry title='Last price (date/time)' bondReport={bondReport} price={bondReport.lastPrice} secondary={bondReport.lastDateTime} />}
        {bondReport.bidPrice && <YTMReportEntry title='Bid price (vol, cnt)' bondReport={bondReport} price={bondReport.bidPrice} secondary={`${bondReport.bidVolume}, ${bondReport.bidCount}`} />}
        {bondReport.askPrice && <YTMReportEntry title='Ask price (vol, cnt)' bondReport={bondReport} price={bondReport.askPrice} secondary={`${bondReport.askVolume}, ${bondReport.askCount}`} />}
        <Typography component='span' sx={{
          display: 'flex',
          justifyContent: 'right',
          pr: 1,
          fontSize: '0.7rem',
          color: 'lightgray'
        }}>Updated on: {new Date(bondReport.detailsUpdatedTs).toLocaleString('pl-PL')}</Typography>
      </Paper>
    </>
  );
}
