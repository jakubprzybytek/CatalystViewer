import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Divider from '@mui/material/Divider';
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { BondReport } from "../sdk/GetBonds";

type BondsListParam = {
  bondReports: BondReport[];
}

export default function BondsList({ bondReports }: BondsListParam): JSX.Element {
  return (
    <Box sx={{
      '& > div': {
        m: 1,
        p: 1
      }
    }}>
      {bondReports.map((bond) => (
        <Paper key={`${bond.details.name}#${bond.details.market}`}>
          <Grid container sx={{
            '& > .MuiGrid-container': {
              justifyContent: 'space-between',
              pl: 1,
              '& > *': {
                display: 'flex',
                pr: 1
              },
              '& span': {
                textAlign: 'end'
              },
              '& .MuiTypography-caption': {
                color: 'gray',
                lineHeight: 1.3
              },
              '& .MuiTypography-body1': {
                pb: 0.4
              }
            }
          }}>
            <Grid item container direction='row' xs={12} sm={4} sx={{
              '& > div': {
                width: '100%',
                justifyContent: 'space-between'
              }
            }}>
              <Stack direction='row'>
                <Typography variant='h4'>{bond.details.name}</Typography>
                <Stack>
                  <Typography component='span' variant='caption'>Makret</Typography>
                  <Typography component='span'>{bond.details.market}</Typography>
                </Stack>
              </Stack>
              <Stack direction='row'>
                <Stack>
                  <Typography component='span' variant='caption'>Issuer</Typography>
                  <Typography component='span'>{bond.details.issuer}</Typography>
                </Stack>
                <Stack>
                  <Typography component='span' variant='caption'>Type</Typography>
                  <Typography component='span'>{bond.details.type}</Typography>
                </Stack>
              </Stack>
            </Grid>
            <Grid item container direction='row' xs={12} sm={4} sx={{
              '& > div': {
                width: '100%',
                justifyContent: 'space-between'
              }
            }}>
              <Stack direction='row'>
                <Stack>
                  <Typography component='span' variant='caption'>Maturity day</Typography>
                  <Typography component='span'><>{bond.details.maturityDay.toString().substring(0, 10)}</></Typography>
                </Stack>
                <Stack>
                  <Typography component='span' variant='caption'>Nominal value</Typography>
                  <Typography component='span'>{bond.details.nominalValue.toFixed(2)}</Typography>
                </Stack>
              </Stack>
              <Stack direction='row'>
                <Stack>
                  <Typography component='span' variant='caption'>Interest Type</Typography>
                  <Typography component='span'>{bond.details.interestType}</Typography>
                </Stack>
              </Stack>
            </Grid>
            <Divider /> 
            <Grid item container xs={12} sm={4} sx={{
              '& > div': {
                width: '100%',
                justifyContent: 'space-between'
              }
            }}>
              <Stack direction='row'>
                <Stack>
                  <Typography component='span' variant='caption'>Current interest</Typography>
                  <Typography component='span'>{bond.details.currentInterestRate.toFixed(2)}%</Typography>
                </Stack>
                <Stack>
                  <Typography component='span' variant='caption'>Accured interest</Typography>
                  <Typography component='span'>{bond.details.accuredInterest.toFixed(2)}</Typography>
                </Stack>
              </Stack>
              <Stack direction='row'>
                <Stack>
                  <Typography component='span' variant='caption'>Closing price</Typography>
                  <Typography component='span'>{bond.closingPrice.toFixed(2)}</Typography>
                </Stack>
                <Stack>
                  <Typography component='span' variant='caption'>Closing price YTM</Typography>
                  <Typography component='span'>{(bond.closingPriceYtm.ytm * 100).toFixed(2)}%</Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      ))
      }
    </Box >
  );
}