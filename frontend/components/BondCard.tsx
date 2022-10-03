import Stack from "@mui/material/Stack";
import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { BondReport } from "../sdk/GetBonds";
import { formatCurrency } from "../common/Formats";
import { Box } from "@mui/system";
import { Link } from "@mui/material";

type BondCardEntryParam = {
  caption: string;
  textAlign?: 'left' | 'center' | 'end';
  colorCode?: 'none' | 'lightpink' | 'orange' | 'lightgreen';
  children: React.ReactNode;
}

function BondCardEntry({ caption, textAlign = 'left', colorCode, children }: BondCardEntryParam): JSX.Element {
  return (
    <Stack sx={{
      '& > span': { textAlign: textAlign }
    }}>
      <Typography component='span' variant='caption'>{caption}</Typography>
      {colorCode && colorCode !== 'none' ?
        <Box component='span'><Typography component='span' sx={{ backgroundColor: colorCode, p: '1px 3px 1px 3px' }}>{children}</Typography></Box>
        : <Typography component='span'>{children}</Typography>}
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
  const nominalValueColorCode = bond.details.nominalValue >= 50000 ? 'lightpink' : bond.details.nominalValue >= 10000 ? 'orange' : 'lightgreen';
  return (
    <>
      <Paper sx={{
        '& .MuiTypography-caption': {
          color: 'gray',
          lineHeight: 1.3
        }
      }}>
        <BondCardSection>
          <Typography variant='h4'><Link href={`https://obligacje.pl/pl/obligacja/${bond.details.name}`} target='_blank'>{bond.details.name}</Link></Typography>
          <BondCardEntry caption='Market' textAlign='end'>{bond.details.market}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Issuer'>{bond.details.issuer}</BondCardEntry>
          <BondCardEntry caption='Type' textAlign='end'>{bond.details.type}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Maturity day'>{bond.details.maturityDay.toString().substring(0, 10)}</BondCardEntry>
          <Divider orientation='vertical' variant='middle' flexItem />
          <BondCardEntry caption='Nominal value' textAlign='center' colorCode={nominalValueColorCode}>{formatCurrency(bond.details.nominalValue, 'PLN')}</BondCardEntry>
          <Divider orientation='vertical' variant='middle' flexItem />
          <BondCardEntry caption='Interest Type' textAlign='end'>{bond.details.interestVariable && `${bond.details.interestVariable} + `}{bond.details.interestConst}%</BondCardEntry>
        </BondCardSection>
        <Divider />
        <BondCardSection>
          <BondCardEntry caption='Current interest'>{bond.details.currentInterestRate.toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Accured interest (since)' textAlign='center'>{formatCurrency(bond.details.accuredInterest, 'PLN')} ({bond.previousInterestPayoffDay})</BondCardEntry>
          <BondCardEntry caption='Next interest' textAlign='center'>{bond.nextInterestPayoffDay}</BondCardEntry>
        </BondCardSection>
        <BondCardSection>
          <BondCardEntry caption='Closing price'>{bond.closingPrice.toFixed(2)}</BondCardEntry>
          <BondCardEntry caption='Closing price YTM - net' textAlign='end'>{(bond.closingPriceNetYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
          <BondCardEntry caption='Closing price YTM - gross' textAlign='end'>{(bond.closingPriceGrossYtm.ytm * 100).toFixed(2)}%</BondCardEntry>
        </BondCardSection>
        <Typography component='span' sx={{
          display: 'flex',
          justifyContent: 'right',
          pr: 1,
          fontSize: '0.7rem',
          color: 'lightgray'
        }}>Updated on: {bond.detailsUpdated}</Typography>
      </Paper>
    </>
  );
}