import * as R from 'ramda';
import { average, quantile } from 'simple-statistics';
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Divider from '@mui/material/Divider';
import { BondReport, BondDetails } from "../sdk/GetBonds";

const interestVariable = R.compose<BondReport[], BondDetails, string | undefined, string>(R.defaultTo('Const'), R.prop('interestVariable'), R.prop('details'));
const sort = R.sortBy<string>(R.identity);

const constInterests = R.map(R.compose<BondReport[], BondDetails, number>(R.prop('interestConst'), R.prop('details')));

type BondInterestTypeStatParam = {
  interestVariableType: string;
  bondReports: BondReport[];
}

function BondInterestTypeStat({ interestVariableType, bondReports }: BondInterestTypeStatParam): JSX.Element {
  return (
    <Paper sx={{
      textAlign: 'center',
      '& > div': {
        p: 1,
        pb: 0,
        justifyContent: 'space-around'
      },
      '& .MuiTypography-caption': {
        color: 'gray',
        lineHeight: 1.3
      }
    }}>
      <Typography variant='h6'>{interestVariableType}</Typography>
      <Stack direction='row'>
        <Stack>
          <Typography variant='caption'>Number</Typography>
          <Typography>{bondReports.length}</Typography>
        </Stack>
        <Divider orientation='vertical' variant='middle' flexItem />
        <Stack sx={{ textAlign: 'right' }}>
          <Typography variant='caption'>Avg interest</Typography>
          <Typography>{average(constInterests(bondReports)).toFixed(2)}%</Typography>
        </Stack>
      </Stack>
      <Stack>
        <Typography variant='caption'>Quartiles (0, ¼, ½, ¾, 1)</Typography>
        <Typography>{quantile(constInterests(bondReports), [0, 0.25, 0.5, 0.75, 1])
          .map((q) => q.toFixed(2))
          .join(', ')}</Typography>
      </Stack>
    </Paper>
  );
}

type BondsListParam = {
  bondReports: BondReport[];
}

export default function BondsListStats({ bondReports }: BondsListParam): JSX.Element {

  const bondsByInterestVariableTypes = R.groupBy(interestVariable)(bondReports);

  return (
    <Box>
      <Grid container spacing={1}>
        {sort(Object.keys(bondsByInterestVariableTypes)).map((interestVariableType) => (
          <Grid key={interestVariableType} item xs={6} sm={4} md={3}>
            <BondInterestTypeStat interestVariableType={interestVariableType} bondReports={bondsByInterestVariableTypes[interestVariableType]} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}