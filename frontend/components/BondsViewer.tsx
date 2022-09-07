import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { getBonds, BondReport } from "../sdk/GetBonds";

export default function EventsBrowser(): JSX.Element {
  const [bonds, setBonds] = useState<BondReport[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const bonds = await getBonds();
      setBonds(bonds);
    };

    fetchData();
  }, []);

  return (
    <Box sx={{
      '& > div': {
        m: 1,
        p: 1
      }
    }}>
      {bonds && bonds.map((bond) => (
        <Paper key={bond.details.name}>
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
                  <Typography component='span' variant='caption'>ISIN</Typography>
                  <Typography component='span'>{bond.details.isin}</Typography>
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
                  <Typography component='span' variant='caption'>Current interest</Typography>
                  <Typography component='span'>{bond.details.currentInterestRate.toFixed(2)}%</Typography>
                </Stack>
                <Stack>
                  <Typography component='span' variant='caption'>Accured interest</Typography>
                  <Typography component='span'>{bond.details.accuredInterest.toFixed(2)}</Typography>
                </Stack>
              </Stack>
            </Grid>
            <Grid item container xs={12} sm={4}>
              <Stack>
                <Typography component='span' variant='caption'>Closing price</Typography>
                <Typography component='span'>{bond.closingPrice.toFixed(2)}</Typography>
              </Stack>
              <Stack>
                <Typography component='span' variant='caption'>Closing price YTM</Typography>
                <Typography component='span'>{(bond.closingPriceYtm.ytm * 100).toFixed(2)}%</Typography>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      ))
      }
    </Box >
  );
}