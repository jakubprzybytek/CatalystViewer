import { memo, useState } from 'react';
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import { CardSectionRow, CardEntry, CardValue } from "@/common/Cards";
import { ColorCode } from "@/common/ColorCodes";
import { getInterestConstColorCode, getNominalValueColorCode } from "@/bonds/BondIndicators";
import { IssuerReport } from './IssuersList';
import { InterestPercentilesByInterestBaseType } from "@/bonds/statistics";
import { formatCurrency } from "@/common/Formats";
import IssuerScorecard from './IssuerScorecard';
import AnalysisReportModal from './AnalysisReportModal';
import { SignalDot } from './SignalDot';
import { triggerFundamentalAnalysis } from '@/sdk/Issuers';

export const interestConstPartColors: ColorCode[] = ['green', 'yellow', 'orange', 'red'];

function getIndustryColors(industry: string): { backgroundColor: string; color: string } {
  switch (industry) {
    case 'Developer':
      return { backgroundColor: '#FECACA', color: '#7F1D1D' };
    case 'Finance':
      return { backgroundColor: '#BFDBFE', color: '#1E3A5F' };
    case 'Energy':
      return { backgroundColor: '#FED7AA', color: '#7C2D12' };
    case 'Health Services':
      return { backgroundColor: '#BBF7D0', color: '#14532D' };
    case 'Retail':
      return { backgroundColor: '#E9D5FF', color: '#4C1D95' };
    case 'Manufacturing':
      return { backgroundColor: '#D6BCB0', color: '#3E2118' };
    case 'Municipal':
      return { backgroundColor: '#99F6E4', color: '#134E4A' };
    case 'Telecommunications':
      return { backgroundColor: '#BAE6FD', color: '#0C4A6E' };
    case 'Transportation & Logistics':
      return { backgroundColor: '#FEF08A', color: '#713F12' };
    case 'Media':
      return { backgroundColor: '#FBCFE8', color: '#831843' };
    case 'Construction':
      return { backgroundColor: '#D9F99D', color: '#365314' };
    default:
      return { backgroundColor: '#CBD5E1', color: '#1E293B' };
  }
}

type IssuerCardParam = {
  issuerReport: IssuerReport;
  statistics: InterestPercentilesByInterestBaseType;
  isChecked: boolean;
  onIssuerChecked: (issuerName: string, checked: boolean) => void;
}

function IssuerCard({ issuerReport, statistics, isChecked, onIssuerChecked }: IssuerCardParam): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const minNominalValueColorCode = getNominalValueColorCode(issuerReport.minNominalValue);
  const interestConstColorCode = getInterestConstColorCode(issuerReport.interestConstAverage, statistics[issuerReport.interestBaseType]);
  const industryColors = issuerReport.industry ? getIndustryColors(issuerReport.industry) : undefined;

  const handleTriggerAnalysis = async () => {
    setConfirmOpen(false);
    try {
      await triggerFundamentalAnalysis(issuerReport.name);
      setSnackbarOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Paper className={`issuer-card${isChecked ? ' selected' : ''}`} variant="outlined" sx={{
        pb: 1,
        '& .MuiTypography-subtitle2': {
          lineHeight: '24px'
        },
        '& > hr': {
          paddingTop: 1
        }
      }}>
        <CardSectionRow>
          <Stack direction='row' flexGrow={1} justifyContent='space-between' alignItems='flex-start'>
            <Typography variant='h6' sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--cv-text-primary)' }}>{issuerReport.name}</Typography>
            <Stack direction='column' alignItems='flex-end'>
              <Stack direction='row' alignItems='center' spacing={0.5}>
                <IconButton size='small' title='Run Fundamental Analysis' onClick={() => setConfirmOpen(true)}>
                  <QueryStatsOutlinedIcon />
                </IconButton>
                {(issuerReport.businessSummary || issuerReport.websiteUrl || issuerReport.scorecard) && (
                  <IconButton size='small' onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />}
                  </IconButton>
                )}
              </Stack>
              <Stack direction='row' alignItems='center'>
                <Checkbox
                  size='small'
                  checked={isChecked}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => onIssuerChecked(issuerReport.name, event.target.checked)} />
                <Typography variant='caption' color='text.secondary'>Selected</Typography>
              </Stack>
            </Stack>
          </Stack>
        </CardSectionRow>
        {(issuerReport.industry && industryColors || issuerReport.scorecard) && (
          <CardSectionRow>
            <Stack direction='row' spacing={0.5} sx={{ mt: -1 }} alignItems='center' flexWrap='wrap'>
              {issuerReport.industry && industryColors && (
                <Chip
                  size='small'
                  label={issuerReport.industry}
                  sx={{
                    backgroundColor: industryColors.backgroundColor,
                    color: industryColors.color,
                    filter: 'saturate(85%)',
                    fontWeight: 400,
                  }}
                />
              )}
              {issuerReport.scorecard && issuerReport.scorecard.dimensions.length > 0 && (
                <Chip
                  size='small'
                  variant='outlined'
                  label={
                    <Stack direction='row' alignItems='center' spacing={0}>
                      <QueryStatsOutlinedIcon sx={{ fontSize: '0.85rem', mr: 0.25 }} />
                      {issuerReport.scorecard.dimensions.map((d, i) => (
                        <SignalDot key={i} signal={d.signal} />
                      ))}
                    </Stack>
                  }
                  sx={{ fontWeight: 400 }}
                />
              )}
            </Stack>
          </CardSectionRow>
        )}
        <Collapse in={expanded && !!(issuerReport.businessSummary || issuerReport.websiteUrl || issuerReport.scorecard)}>
          <Box className='expanded-content'>
            <CardSectionRow>
              {issuerReport.businessSummary && (
                <CardEntry caption='Summary' width='100%'>
                  <CardValue>{issuerReport.businessSummary}</CardValue>
                </CardEntry>
              )}
            </CardSectionRow>
            {issuerReport.websiteUrl && (
              <CardSectionRow>
                <CardEntry caption='Website URL' width='100%'>
                  <CardValue>
                    <Box component='a' href={issuerReport.websiteUrl} target='_blank' rel='noreferrer'
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'primary.main', textDecorationColor: 'primary.main' }}>
                      {issuerReport.websiteUrl}
                      <OpenInNewOutlinedIcon sx={{ fontSize: '0.9em' }} />
                    </Box>
                  </CardValue>
                </CardEntry>
              </CardSectionRow>
            )}
            {issuerReport.classifiedAtTs && (
              <Typography component='span' className='tiny-text'>Classified on: {new Date(issuerReport.classifiedAtTs).toLocaleString('pl-PL')}</Typography>
            )}
            {issuerReport.scorecard && (
              <>
                <CardSectionRow>
                  <IssuerScorecard scorecard={issuerReport.scorecard} />
                </CardSectionRow>
                {issuerReport.performedAt && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: '8px', mt: 0.5 }}>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setModalOpen(true)}
                      >
                        Full report →
                      </Button>
                    </Box>
                    <Typography component='span' className='tiny-text'>
                      Analysed on: {new Date(issuerReport.performedAt).toLocaleString('pl-PL')}
                    </Typography>
                  </>
                )}
              </>
            )}
          </Box>
        </Collapse>
        <CardSectionRow>
          <CardEntry caption='Bonds'>
            <CardValue bold>{issuerReport.count}</CardValue>
          </CardEntry>
          <CardEntry caption='Nominal value(s)' textAlign='center'>
            {issuerReport.minNominalValue === issuerReport.maxNominalValue &&
              <CardValue colorCode={minNominalValueColorCode}>{formatCurrency(issuerReport.minNominalValue, issuerReport.currency)}</CardValue>}
            {issuerReport.minNominalValue !== issuerReport.maxNominalValue &&
              <Stack direction='row' spacing={0.5}>
                <CardValue colorCode={minNominalValueColorCode}>{formatCurrency(issuerReport.minNominalValue, issuerReport.currency)}</CardValue>
                <span>-</span>
                <CardValue colorCode={getNominalValueColorCode(issuerReport.maxNominalValue)}>{formatCurrency(issuerReport.maxNominalValue, issuerReport.currency)}</CardValue>
              </Stack>}
          </CardEntry>
          <CardEntry caption='Avg interest Type' textAlign='end'>
            <CardValue colorCode={interestConstColorCode}>{issuerReport.interestBaseType} + {issuerReport.interestConstAverage.toPrecision(2)}%</CardValue>
          </CardEntry>
        </CardSectionRow>
        <CardSectionRow>
          <CardEntry caption='Avg issue value'>
            {issuerReport.count > 1 && <CardValue colorCode='white'>{formatCurrency(issuerReport.avgIssueValue, issuerReport.currency)}</CardValue>}
          </CardEntry>
          <CardEntry caption='Total issue value' textAlign='end'>
            <CardValue colorCode='white'>{formatCurrency(issuerReport.totalIssueValue, issuerReport.currency)}</CardValue>
          </CardEntry>
        </CardSectionRow>
      </Paper>
      <AnalysisReportModal
        issuerName={issuerReport.name}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Run Fundamental Analysis</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to trigger fundamental analysis for that issuer?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>
          <Button onClick={handleTriggerAnalysis} variant='contained'>Yes</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message='Fundamental analysis workflow started'
      />
    </>
  );
}

export default memo(IssuerCard, (prevProps, nextProps) => {
  return prevProps.issuerReport === nextProps.issuerReport
    && prevProps.statistics === nextProps.statistics
    && prevProps.isChecked === nextProps.isChecked;
});
