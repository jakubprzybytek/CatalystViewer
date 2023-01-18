import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import { CardSection, CardEntry, CardValue } from "../Cards";
import { ColorCode } from "../../common/ColorCodes";
import { getInterestConstColorCode, getNominalValueColorCode } from "../../bonds/BondIndicators";
import { IssuerReport } from '.';
import { InterestPercentilesByInterestBaseType } from "../../bonds/statistics";
import { formatCurrency } from "../../common/Formats";
import { useBondsFilters } from "../BondsFilter/useBondsFilters";

export const interestConstPartColors: ColorCode[] = ['green', 'yellow', 'orange', 'red'];

type IssuerCardParam = {
  issuerReport: IssuerReport;
  statistics: InterestPercentilesByInterestBaseType;
}

export default function IssuerCard({ issuerReport, statistics }: IssuerCardParam): JSX.Element {
  const { issuersFilterStrings, addIssuerFilterString, removeIssuerFilterString } = useBondsFilters();

  const minNominalValueColorCode = getNominalValueColorCode(issuerReport.minNominalValue);
  const interestConstColorCode = getInterestConstColorCode(issuerReport.interestConstAverage, statistics[issuerReport.interestBaseType]);

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
        <CardSection>
          <Stack direction='row' flexGrow={1} justifyContent='space-between'>
            <Typography variant='h6'>{issuerReport.name}</Typography>
            <Checkbox
              checked={issuersFilterStrings.includes(issuerReport.name)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => event.target.checked ? addIssuerFilterString(issuerReport.name) : removeIssuerFilterString(issuerReport.name)} />
          </Stack>
        </CardSection>
        <CardSection>
          <CardEntry caption='Bonds'>
            <CardValue variant='h6'>{issuerReport.count}</CardValue>
          </CardEntry>
          <CardEntry caption='Nominal values' textAlign='center'>
            {issuerReport.minNominalValue === issuerReport.maxNominalValue &&
              <CardValue colorCode={minNominalValueColorCode}>{formatCurrency(issuerReport.minNominalValue, issuerReport.currency)}</CardValue>}
            {issuerReport.minNominalValue !== issuerReport.maxNominalValue &&
              <Stack direction='row' spacing={0.5}>
                <CardValue colorCode={minNominalValueColorCode}>{formatCurrency(issuerReport.minNominalValue, issuerReport.currency)}</CardValue>
                <span>-</span>
                <CardValue colorCode={getNominalValueColorCode(issuerReport.maxNominalValue)}>{formatCurrency(issuerReport.maxNominalValue, issuerReport.currency)}</CardValue>
              </Stack>}
          </CardEntry>
          <CardEntry caption='Interest Type' textAlign='end'>
            <CardValue colorCode={interestConstColorCode}>{issuerReport.interestBaseType} + {issuerReport.interestConstAverage.toPrecision(2)}%</CardValue>
          </CardEntry>
        </CardSection>
      </Paper>
    </>
  );
}
