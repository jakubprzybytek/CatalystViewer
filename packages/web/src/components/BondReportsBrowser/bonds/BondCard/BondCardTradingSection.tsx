import Grid from '@mui/material/Grid';
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import { BondReport } from '@sdk/Bonds';
import { formatCompactCurrency, formatCurrency } from '@/common/Formats';
import { CardEntry, CardValue } from '@/common/Cards/CardEntry';
import { CardSectionRow } from '@/common/Cards/CardSectionRow';
import { ColorCode } from '@/common/ColorCodes';
import BondCardYTMSection from './BondCardYTMSection';
import BondLiquidityDialog from './BondLiquidityDialog';
import { useState } from 'react';

type BondCardTradingSectionParam = {
  bondReport: BondReport;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export default function BondCardTradingSection({ bondReport, expanded, onToggleExpanded }: BondCardTradingSectionParam): React.JSX.Element {
  const { details, currentValues } = bondReport;
  const [liquidityReport, setLiquidityReport] = useState<BondReport | undefined>(undefined);

  const tradingDaysColorCode: ColorCode = currentValues.tradingDaysRatio > 0.75 ? 'green' : currentValues.tradingDaysRatio > 0.5 ? 'yellow' : currentValues.tradingDaysRatio > 0.25 ? 'orange' : 'red';

  return (
    <Grid className='card-section' size={{ xs: 12, md: 4 }}>
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
        <IconButton size='small' sx={{ display: { xs: 'none', md: 'inline-flex' }, paddingLeft: 2, paddingTop: 0 }} onClick={onToggleExpanded}>
          {expanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />}
        </IconButton>
      </CardSectionRow>
      {bondReport.lastPrice && <BondCardYTMSection title='Last price (date/time)' bondReport={bondReport} price={bondReport.lastPrice} secondary={bondReport.lastDateTime} />}
      <Collapse in={expanded}>
        {bondReport.bidPrice && <BondCardYTMSection title='Bid price (vol, cnt)' bondReport={bondReport} price={bondReport.bidPrice} secondary={`${bondReport.bidVolume}, ${bondReport.bidCount}`} />}
        {bondReport.askPrice && <BondCardYTMSection title='Ask price (vol, cnt)' bondReport={bondReport} price={bondReport.askPrice} secondary={`${bondReport.askVolume}, ${bondReport.askCount}`} />}
      </Collapse>
      <Typography component='span' className='tiny-text'>Updated on: {new Date(bondReport.detailsUpdatedTs).toLocaleString('pl-PL')}</Typography>
    </Grid>
  );
}
