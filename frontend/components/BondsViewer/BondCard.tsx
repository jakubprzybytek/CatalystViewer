import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { BondReport } from "../../sdk/GetBonds";
import { formatCurrency } from '../../common/Formats';
import { CardSection, CardEntry, CardValue } from "../Cards";
import { InterestPercentilesByInterestBaseType, interestBaseType } from "../../bonds/statistics";
import { getNominalValueColorCode, getInterestConstColorCode } from '../../bonds/BondIndicators';
import BondCardCurrentInterestSection from './BondCardCurrentInterestSection';
import YTMReportEntry from "./BondCardYTMSection";

type BondCardParam = {
  bondReport: BondReport;
  statistics: InterestPercentilesByInterestBaseType;
}

function BondCardMainInformationSection({ bondReport, statistics }: BondCardParam): JSX.Element {
  const { details } = bondReport;

  const nominalValueColorCode = getNominalValueColorCode(details.nominalValue);
  const interestConstColorCode = getInterestConstColorCode(details.interestConst, statistics[interestBaseType(bondReport)]);

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
          <CardValue colorCode={nominalValueColorCode}>
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

export default function BondCard({ bondReport, statistics }: BondCardParam): JSX.Element {
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
        <BondCardMainInformationSection bondReport={bondReport} statistics={statistics} />
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
