import Paper from "@mui/material/Paper";
import { CardSection, CardEntry, CardValue } from "../Cards";
import { ColorCode } from "../../common/ColorCodes";
import { IssuerReport } from '.';
import Typography from "@mui/material/Typography";

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
            <CardValue>{issuerReport.count}</CardValue>
          </CardEntry>
          <CardEntry caption='Nominal values' textAlign='end'>
            <CardValue>{issuerReport.minNominalValue}{issuerReport.minNominalValue !== issuerReport.maxNominalValue ? ` - ${issuerReport.maxNominalValue}` : ''}</CardValue>
          </CardEntry>
        </CardSection>
        <CardSection>
          <CardEntry caption='Interest Variable Type'>
            <CardValue>{issuerReport.interestVariable}</CardValue>
          </CardEntry>
          <CardEntry caption='Interest Const Avg.' textAlign='end'>
            <CardValue>{issuerReport.interestConstAverage.toPrecision(2)}%</CardValue>
          </CardEntry>
        </CardSection>
      </Paper>
    </>
  );
}
