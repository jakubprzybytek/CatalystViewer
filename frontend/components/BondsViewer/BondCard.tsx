import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { BondReport } from "../../sdk/GetBonds";
import { InterestPercentilesByInterestBaseType } from "../../bonds/statistics";
import BondCardMainInformationSection from './BondCardMainInformationSection';
import BondCardCurrentInterestSection from './BondCardCurrentInterestSection';
import BondCardYTMSection from "./BondCardYTMSection";

type BondCardParam = {
  bondReport: BondReport;
  statistics: InterestPercentilesByInterestBaseType;
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
        {!bondReport.lastPrice && bondReport.referencePrice && <BondCardYTMSection title='Reference price' bondReport={bondReport} price={bondReport.referencePrice} />}
        {bondReport.lastPrice && <BondCardYTMSection title='Last price (date/time)' bondReport={bondReport} price={bondReport.lastPrice} secondary={bondReport.lastDateTime} />}
        {bondReport.bidPrice && <BondCardYTMSection title='Bid price (vol, cnt)' bondReport={bondReport} price={bondReport.bidPrice} secondary={`${bondReport.bidVolume}, ${bondReport.bidCount}`} />}
        {bondReport.askPrice && <BondCardYTMSection title='Ask price (vol, cnt)' bondReport={bondReport} price={bondReport.askPrice} secondary={`${bondReport.askVolume}, ${bondReport.askCount}`} />}
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
