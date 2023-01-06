import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { BondReport } from "../../sdk/GetBonds";
import { formatCurrency } from "../../common/Formats";
import YTMReportEntry from "./BondCardYTMSection";
import { BondCardSection } from "./BondCardSection";
import { BondCardEntry, BondCardValue, Color } from "./BondCardEntry";
import { BondsStatistics, interestVariablePart } from "../../bonds/statistics";

export const interestConstPartColors: Color[] = ['lightgreen', 'yellow', 'orange', 'lightpink'];

type BondCardParam = {
  bondReport: BondReport;
  bondsStatistics: BondsStatistics;
}

type BondReportParam = {
  bondReport: BondReport;
}

function BondCardMainInformationSection({ bondReport, bondsStatistics }: BondCardParam): JSX.Element {
  const { details } = bondReport;
  const nominalValueColorCode: Color = details.nominalValue >= 50000 ? 'lightpink' : details.nominalValue >= 10000 ? 'orange' : 'lightgreen';
  const interestConstIndex = bondsStatistics.byType[details.type][interestVariablePart(bondReport)]
    .findIndex(percentile => bondReport.details.interestConst <= percentile) - 1;
  const interestConstColorCode: Color = interestConstPartColors[Math.max(interestConstIndex, 0)];

  return (
    <>
      <BondCardSection>
        <Typography variant='h4'><Link href={`https://obligacje.pl/pl/obligacja/${bondReport.details.name}`} target='_blank'>{bondReport.details.name}</Link></Typography>
        <BondCardEntry caption='Market' textAlign='end'>{bondReport.details.market}</BondCardEntry>
      </BondCardSection>
      <BondCardSection>
        <BondCardEntry caption='Issuer'>
          <BondCardValue variant='h6'>{bondReport.details.issuer}</BondCardValue>
        </BondCardEntry>
        <BondCardEntry caption='Type' textAlign='end'>{bondReport.details.type}</BondCardEntry>
      </BondCardSection>
      <BondCardSection>
        <BondCardEntry caption='Maturity day'>
          {bondReport.details.maturityDay.toString().substring(0, 10)}
        </BondCardEntry>
        <BondCardEntry caption='Nominal value' textAlign='center'>
          <BondCardValue colorCode={nominalValueColorCode}>
            {formatCurrency(bondReport.details.nominalValue, bondReport.details.currency)}
          </BondCardValue>
        </BondCardEntry>
        <BondCardEntry caption='Interest Type' textAlign='end'>
          <BondCardValue colorCode={interestConstColorCode}>
            {bondReport.details.interestVariable && `${bondReport.details.interestVariable} + `}{bondReport.details.interestConst}%
          </BondCardValue>
        </BondCardEntry>
      </BondCardSection>
    </>
  );
}

function BondCardCurrentInterestSection({ bondReport }: BondReportParam): JSX.Element {
  const accuredInterestColorCode: Color = bondReport.accuredInterest == 0 ? 'lightgreen' : 'none';

  return (
    <>
      <BondCardSection>
        <BondCardEntry caption='First day' width='33%'>
          <BondCardValue>{bondReport.currentInterestPeriodFirstDay}</BondCardValue>
        </BondCardEntry>
        <BondCardEntry caption='Record day' textAlign="center" width='33%'>
          <BondCardValue>{bondReport.nextInterestRightsDay}</BondCardValue>
        </BondCardEntry>
        <BondCardEntry caption='Payable' textAlign="end">
          <BondCardValue>{bondReport.nextInterestPayoffDay}</BondCardValue>
        </BondCardEntry>
      </BondCardSection>
      <BondCardSection>
        <BondCardEntry caption='Current interest' width='33%'>
          <BondCardValue variant='h6'>{bondReport.details.currentInterestRate.toFixed(2)}%</BondCardValue>
        </BondCardEntry>
        <BondCardEntry caption='Accured interest' textAlign="center" width='33%'>
          <BondCardValue colorCode={accuredInterestColorCode}>{formatCurrency(bondReport.details.accuredInterest, bondReport.details.currency)}</BondCardValue>
        </BondCardEntry>
        <BondCardEntry caption='Full interest' textAlign="end">
          <BondCardValue>{formatCurrency(bondReport.nextInterest, bondReport.details.currency)}</BondCardValue>
        </BondCardEntry>
      </BondCardSection>
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
          //          color: 'dimgray',
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
