import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { CardSection, CardEntry, CardValue } from "../Cards";
import { ColorCode } from "../../common/ColorCodes";
import { nominalValueColorCode } from "../../bonds/BondIndicators";
import { IssuerReport } from '.';

export const interestConstPartColors: ColorCode[] = ['green', 'yellow', 'orange', 'red'];

type IssuerCardParam = {
  issuerReport: IssuerReport;
}

export default function IssuerCard({ issuerReport }: IssuerCardParam): JSX.Element {
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
          <Typography variant='h6'>{issuerReport.name}</Typography>
        </CardSection>
        <CardSection>
          <CardEntry caption='Bonds'>
            <CardValue variant='h6'>{issuerReport.count}</CardValue>
          </CardEntry>
          <CardEntry caption='Nominal values' textAlign='center'>
            {issuerReport.minNominalValue === issuerReport.maxNominalValue &&
              <CardValue colorCode={nominalValueColorCode(issuerReport.minNominalValue)}>{issuerReport.minNominalValue}</CardValue>}
            {issuerReport.minNominalValue !== issuerReport.maxNominalValue &&
              <Stack direction='row' spacing={0.5}>
                <CardValue colorCode={nominalValueColorCode(issuerReport.minNominalValue)}>{issuerReport.minNominalValue}</CardValue>
                <span>-</span>
                <CardValue colorCode={nominalValueColorCode(issuerReport.maxNominalValue)}>{issuerReport.maxNominalValue}</CardValue>
              </Stack>}
          </CardEntry>
          <CardEntry caption='Interest Type' textAlign='end'>
            <CardValue colorCode='green'>{issuerReport.interestVariable} + {issuerReport.interestConstAverage.toPrecision(2)}%</CardValue>
          </CardEntry>
        </CardSection>
      </Paper>
    </>
  );
}
