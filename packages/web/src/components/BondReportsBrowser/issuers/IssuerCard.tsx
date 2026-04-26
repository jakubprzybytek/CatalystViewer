import { useState } from 'react';
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import { CardSectionRow, CardEntry, CardValue } from "@/common/Cards";
import { ColorCode } from "@/common/ColorCodes";
import { getInterestConstColorCode, getNominalValueColorCode } from "@/bonds/BondIndicators";
import { IssuerReport } from '.';
import { InterestPercentilesByInterestBaseType } from "@/bonds/statistics";
import { formatCurrency } from "@/common/Formats";

export const interestConstPartColors: ColorCode[] = ['green', 'yellow', 'orange', 'red'];

function getIndustryColors(industry: string): { backgroundColor: string; color: string } {
  switch (industry) {
    case 'Developer':
      return { backgroundColor: '#d32f2f', color: '#ffffff' };
    case 'Finance':
      return { backgroundColor: '#1565c0', color: '#ffffff' };
    case 'Energy':
      return { backgroundColor: '#e65100', color: '#ffffff' };
    case 'Health Services':
      return { backgroundColor: '#2e7d32', color: '#ffffff' };
    case 'Retail':
      return { backgroundColor: '#6a1b9a', color: '#ffffff' };
    case 'Manufacturing':
      return { backgroundColor: '#4e342e', color: '#ffffff' };
    case 'Municipal':
      return { backgroundColor: '#00695c', color: '#ffffff' };
    default:
      return { backgroundColor: '#546e7a', color: '#ffffff' };
  }
}

type IssuerCardParam = {
  issuerReport: IssuerReport;
  statistics: InterestPercentilesByInterestBaseType;
  selectedIssuers: string[];
  addIssuer: (newIssuer: string) => void;
  removeIssuer: (issuerToRemove: string) => void;
}

export default function IssuerCard({ issuerReport, statistics, selectedIssuers, addIssuer, removeIssuer }: IssuerCardParam): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const isChecked = selectedIssuers.includes(issuerReport.name);

  const minNominalValueColorCode = getNominalValueColorCode(issuerReport.minNominalValue);
  const interestConstColorCode = getInterestConstColorCode(issuerReport.interestConstAverage, statistics[issuerReport.interestBaseType]);
  const industryColors = issuerReport.industry ? getIndustryColors(issuerReport.industry) : undefined;

  return (
    <>
      <Paper className='issuer-card' variant="outlined" sx={{
        pb: 1,
        ...(isChecked && { backgroundColor: 'oldlace' }),
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
        <CardSectionRow>
          <Stack direction='row' flexGrow={1} justifyContent='space-between'>
            <Typography variant='h6'>{issuerReport.name}</Typography>
            <Stack direction='row' alignItems='center' spacing={0.5}>
              <Checkbox
                checked={isChecked}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => event.target.checked ? addIssuer(issuerReport.name) : removeIssuer(issuerReport.name)} />
              {issuerReport.businessSummary && (
                <IconButton size='small' onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />}
                </IconButton>
              )}
            </Stack>
          </Stack>
        </CardSectionRow>
        {issuerReport.industry && industryColors && (
          <CardSectionRow>
            <Box sx={{ mt: -0.5 }}>
              <Chip
                size='small'
                label={issuerReport.industry}
                sx={{
                  backgroundColor: industryColors.backgroundColor,
                  color: industryColors.color,
                  fontWeight: 400,
                }}
              />
            </Box>
          </CardSectionRow>
        )}
        <Collapse in={expanded && !!issuerReport.businessSummary}>
          <CardSectionRow>
            <CardEntry caption='Summary' width='100%'>
              <CardValue>{issuerReport.businessSummary ?? ''}</CardValue>
            </CardEntry>
          </CardSectionRow>
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
    </>
  );
}
