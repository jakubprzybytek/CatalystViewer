import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { BondReport } from "../../../sdk/Bonds";
import { InterestPercentilesByInterestBaseType } from "../../../bonds/statistics";
import BondCardMainInformationSection from './BondCardMainInformationSection';
import BondCardCurrentInterestSection from './BondCardCurrentInterestSection';
import BondCardYTMSection from "./BondCardYTMSection";
import BondCardLiquiditySection from './BondCardLiquiditySection';

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
        '& .MuiDivider-root': {
          paddingTop: 0.5,
          color: 'gray',
          fontSize: '0.75em'
        }
      }}>
        <BondCardMainInformationSection bondReport={bondReport} statistics={statistics} />
        <Divider>Current interest</Divider>
        <BondCardCurrentInterestSection bondReport={bondReport} />
        <Divider>Liquidity (over 30 days)</Divider>
        <BondCardLiquiditySection bondReport={bondReport} />
        <Divider>Yield to maturity</Divider>
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
