import Paper from "@mui/material/Paper";
import { BondCardSection } from "../BondsViewer/BondCard/BondCardSection";
import { BondCardEntry, BondCardValue } from "../BondsViewer/BondCard/BondCardEntry";
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
        <BondCardSection>
          <Typography variant='h6'>{issuerReport.name}</Typography>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Bonds'>
            <BondCardValue>{issuerReport.count}</BondCardValue>
          </BondCardEntry>
          <BondCardEntry caption='Nominal values' textAlign='end'>
            <BondCardValue>{issuerReport.minNominalValue}{issuerReport.minNominalValue !== issuerReport.maxNominalValue ? ` - ${issuerReport.maxNominalValue}` : ''}</BondCardValue>
          </BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Interest Variable Type'>
            <BondCardValue>{issuerReport.interestVariable}</BondCardValue>
          </BondCardEntry>
          <BondCardEntry caption='Interest Const Avg.' textAlign='end'>
            <BondCardValue>{issuerReport.interestConstAverage.toPrecision(2)}%</BondCardValue>
          </BondCardEntry>
        </BondCardSection>
      </Paper>
    </>
  );
}
