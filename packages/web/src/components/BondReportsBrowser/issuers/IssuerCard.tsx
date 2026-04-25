import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { CardSectionRow, CardEntry, CardValue } from "@/common/Cards";
import { ColorCode } from "@/common/ColorCodes";
import { getInterestConstColorCode, getNominalValueColorCode } from "@/bonds/BondIndicators";
import { IssuerReport } from '.';
import { InterestPercentilesByInterestBaseType } from "@/bonds/statistics";
import { formatCurrency } from "@/common/Formats";
import { useState } from "react";
import IssuerSummaryDialog from "./IssuerSummaryDialog";

export const interestConstPartColors: ColorCode[] = ['green', 'yellow', 'orange', 'red'];

const INDUSTRY_COLORS: Record<string, { color: string; borderColor: string; backgroundColor: string }> = {
  'Developer':       { color: '#b71c1c', borderColor: '#e53935', backgroundColor: '#ffebee' },
  'Finance':         { color: '#0d47a1', borderColor: '#1e88e5', backgroundColor: '#e3f2fd' },
  'Health Services': { color: '#1b5e20', borderColor: '#43a047', backgroundColor: '#e8f5e9' },
  'Energy':          { color: '#e65100', borderColor: '#fb8c00', backgroundColor: '#fff3e0' },
  'Retail':          { color: '#4a148c', borderColor: '#8e24aa', backgroundColor: '#f3e5f5' },
  'Manufacturing':   { color: '#1a237e', borderColor: '#3949ab', backgroundColor: '#e8eaf6' },
  'Municipal':       { color: '#006064', borderColor: '#00acc1', backgroundColor: '#e0f7fa' },
  'Other':           { color: '#424242', borderColor: '#757575', backgroundColor: '#f5f5f5' },
};

export function industryChipSx(industry: string): object {
  const colors = INDUSTRY_COLORS[industry] ?? INDUSTRY_COLORS['Other'];
  return {
    color: colors.color,
    borderColor: colors.borderColor,
    backgroundColor: colors.backgroundColor,
    fontWeight: 500,
  };
}

type IssuerCardParam = {
  issuerReport: IssuerReport;
  statistics: InterestPercentilesByInterestBaseType;
  selectedIssuers: string[];
  addIssuer: (newIssuer: string) => void;
  removeIssuer: (issuerToRemove: string) => void;
}

export default function IssuerCard({ issuerReport, statistics, selectedIssuers, addIssuer, removeIssuer }: IssuerCardParam): React.JSX.Element {
  const isChecked = selectedIssuers.includes(issuerReport.name);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const minNominalValueColorCode = getNominalValueColorCode(issuerReport.minNominalValue);
  const interestConstColorCode = getInterestConstColorCode(issuerReport.interestConstAverage, statistics[issuerReport.interestBaseType]);

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
          <Stack direction='column' flexGrow={1}>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Typography variant='h6'>{issuerReport.name}</Typography>
              <Stack direction='row' alignItems='center'>
                {issuerReport.industry && issuerReport.businessSummary && (
                  <IconButton size='small' aria-label='View issuer business summary' onClick={() => setSummaryOpen(true)}>
                    <InfoOutlinedIcon fontSize='small' />
                  </IconButton>
                )}
                <Checkbox
                  checked={isChecked}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => event.target.checked ? addIssuer(issuerReport.name) : removeIssuer(issuerReport.name)} />
              </Stack>
            </Stack>
            {issuerReport.industry && (
              <Chip label={issuerReport.industry} size="small" variant="outlined" sx={industryChipSx(issuerReport.industry)} />
            )}
          </Stack>
        </CardSectionRow>
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
      {issuerReport.industry && issuerReport.businessSummary && summaryOpen && (
        <IssuerSummaryDialog
          issuerName={issuerReport.name}
          industry={issuerReport.industry}
          businessSummary={issuerReport.businessSummary}
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </>
  );
}

