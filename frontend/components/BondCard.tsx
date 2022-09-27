import Stack from "@mui/material/Stack";
import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { BondReport } from "../sdk/GetBonds";

type BondCardEntryParam = {
  caption: string;
  textAlign?: 'left' | 'center' | 'end';
  children: React.ReactNode;
}

function BondCardEntry({ caption, textAlign = 'left', children }: BondCardEntryParam): JSX.Element {
  return (
    <Stack sx={{
      '& > span': { textAlign: textAlign }
    }}>
      <Typography component='span' variant='caption'>{caption}</Typography>
      <Typography component='span'>{children}</Typography>
    </Stack>
  );
}

type BondCardSectionParam = {
  children: React.ReactNode;
}

function BondCardSection({ children }: BondCardSectionParam): JSX.Element {
  return (
    <Stack direction='row' sx={{
      p: 1,
      pb: 0,
      justifyContent: 'space-between'
    }}>
      {children}
    </Stack>
  );
}

type BondCardParam = {
  bond: BondReport;
}

export default function BondCard({ bond }: BondCardParam): JSX.Element {
  return (
    <>
      <Paper sx={{
        pb: 1,
        '& .MuiTypography-caption': {
          color: 'gray',
          lineHeight: 1.3
        }
      }}>
        <BondCardSection>
          <Typography variant='h4'>{bond.details.name}</Typography>
          <BondCardEntry caption='Market' textAlign='end'>{bond.details.market}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Issuer'>{bond.details.issuer}</BondCardEntry>
          <BondCardEntry caption='Type' textAlign='end'>{bond.details.type}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Maturity day'>{bond.details.maturityDay.toString().substring(0, 10)}</BondCardEntry>
          <BondCardEntry caption='Nominal value' textAlign='center'>{bond.details.nominalValue.toFixed(2)}</BondCardEntry>
          <BondCardEntry caption='Interest Type' textAlign='end'>{bond.details.interestType}</BondCardEntry>
        </BondCardSection>
        <Divider />
        <BondCardSection>
          <BondCardEntry caption='Current interest'>{bond.details.currentInterestRate.toFixed(2)}%</BondCardEntry>
          <Divider orientation='vertical' variant='middle' flexItem />
          <BondCardEntry caption='Accured interest' textAlign='center'>{bond.details.accuredInterest.toFixed(2)}</BondCardEntry>
          <Divider orientation='vertical' variant='middle' flexItem />
          <BondCardEntry caption='Closing price' textAlign='center'>{bond.closingPrice.toFixed(2)}</BondCardEntry>
          <Divider orientation='vertical' variant='middle' flexItem />
          <BondCardEntry caption='Closing price YTM' textAlign='end'>{(bond.closingPriceYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
        </BondCardSection>
      </Paper>
    </>
  );
}