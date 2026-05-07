import Grid from '@mui/material/Grid';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import { interestBaseType, InterestPercentilesByInterestBaseType } from '@bonds/statistics';
import { BondReport } from '@sdk/Bonds';
import { formatCompactCurrency, formatCurrency, formatDate } from '@/common/Formats';
import { CardEntry, CardValue } from '@/common/Cards/CardEntry';
import { CardSectionRow } from '@/common/Cards/CardSectionRow';
import { getInterestConstColorCode, getNominalValueColorCode } from '@/bonds/BondIndicators';

type BondCardDetailsSectionParam = {
  bondReport: BondReport;
  statistics: InterestPercentilesByInterestBaseType;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export default function BondCardDetailsSection({ bondReport, statistics, expanded, onToggleExpanded }: BondCardDetailsSectionParam): React.JSX.Element {
  const { details, currentValues } = bondReport;
  const interestConstColorCode = getInterestConstColorCode(details.interestConst, statistics[interestBaseType(bondReport)]);
  const nominalValueColorCode = getNominalValueColorCode(details.nominalValue);

  return (
    <Grid className='card-section' size={{ xs: 12, md: 4 }}>
      <CardSectionRow>
        <Typography variant='h6'><Link href={`https://obligacje.pl/pl/obligacja/${details.name}`} target='_blank'>{details.name}</Link></Typography>
        <IconButton size='small' sx={{ display: { xs: 'inline-flex', md: 'none' } }} onClick={onToggleExpanded}>
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
  );
}
