import * as R from 'ramda';
import { average } from 'simple-statistics';
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Divider from '@mui/material/Divider';
import { BondReport } from "../sdk/GetBonds";
import { BondDetails } from '../../services/bonds';

const interestVariable = R.compose<BondReport, BondDetails, string | undefined, string>(R.defaultTo('none'), R.prop('interestVariable'), R.prop('details'));
const sort = R.sortBy<string>(R.identity);

const constInterests = R.map(R.compose<BondReport, BondDetails, number>(R.prop('interestConst'), R.prop('details')));

type BondInterestTypeStatParam = {
  interestVariableType: string;
  bondReports: BondReport[];
}

function BondInterestTypeStat({ interestVariableType, bondReports }: BondInterestTypeStatParam): JSX.Element {
  return (
    <Paper sx={{
      '& .MuiTypography-caption': {
        color: 'gray',
        lineHeight: 1.3
      }
    }}>
      <Typography variant='h6' sx={{ textAlign: 'center' }}>{interestVariableType}</Typography>
      <Stack direction='row' sx={{
        p: 1,
        pb: 0,
        justifyContent: 'space-between'
      }}>
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
          <Grid key={interestVariableType} item xs={4} sm={3} md={2}>
            <BondInterestTypeStat interestVariableType={interestVariableType} bondReports={bondsByInterestVariableTypes[interestVariableType]} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}