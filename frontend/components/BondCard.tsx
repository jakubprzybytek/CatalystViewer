import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { BondReport } from "../sdk/GetBonds";
import { formatCurrency } from "../common/Formats";
import YTMReportEntry from "./BondCardYTMSection";
import { BondCardSection } from "./BondCardSection";
import { BondCardEntry, Colors } from "./BondCardEntry";
import { BondsStatistics, interestVariablePart } from "../common/BondsStatistics";

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
          //          color: 'dimgray',
          lineHeight: '24px'
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
          <BondCardEntry caption='Current interest (since)' secondary={`(${bondReport.currentInterestPeriodFirstDay})`}>{bondReport.details.currentInterestRate.toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Accured interest (acc)' textAlign='center' secondary={bondReport.details.accuredInterest == 0 ? `(${formatCurrency(bondReport.accumulatedInterest, bondReport.details.currency)})` : undefined}>{formatCurrency(bondReport.details.accuredInterest, bondReport.details.currency)}</BondCardEntry>
          <BondCardEntry caption='Next interest (when)' secondary={`(${bondReport.nextInterestPayoffDay})`} textAlign='end'>
            {formatCurrency(bondReport.nextInterest, bondReport.details.currency)}
          </BondCardEntry>
        </BondCardSection>
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
        }}>Updated on: {bondReport.detailsUpdated}</Typography>
      </Paper>
    </>
  );
}
