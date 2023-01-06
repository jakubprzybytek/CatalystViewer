import * as R from 'ramda';
import { average } from 'simple-statistics';
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Divider from '@mui/material/Divider';
import { BondReport, BondDetails } from "../sdk/GetBonds";
import { BondsStatistics } from '../bonds/statistics';
import { interestConstPartColors } from './BondCard/BondCard';
import { colorMarkers } from "../common/ColorCodes";
import { Fragment } from 'react';

const interestVariable = R.compose<BondReport[], BondDetails, string | undefined, string>(R.defaultTo('Const'), R.prop('interestVariable'), R.prop('details'));
const sort = R.sortBy<string>(R.identity);

const constInterests = R.map(R.compose<BondReport[], BondDetails, number>(R.prop('interestConst'), R.prop('details')));

type InterestChartParam = {
  quartiles: number[];
  bondReports: BondReport[];
}

function InterestChart({ quartiles, bondReports }: InterestChartParam) {
  const margin = Math.max((quartiles[quartiles.length - 1] - quartiles[0]) * 0.1, 0.5);
  const min = quartiles[0] - margin;
  const max = quartiles[quartiles.length - 1] + margin;
  const xScale = (value: number) => (value - min) / (max - min) * 100;
  return (
    <svg width='100%' viewBox='-5 0 110 20' xmlns='http://www.w3.org/2000/svg'>
      <line x1={0} y1={10} x2={100} y2={10} stroke='grey' strokeWidth={0.2} />
      {quartiles.map((quartile, index) => {
        const x = xScale(quartile);
        const y = index % 2 ? 4 : 20;
        return (
          <Fragment key={index}>
            <line x1={x} y1={9} x2={x} y2={11} stroke='grey' strokeWidth={0.2} />
            <text x={x} y={y} style={{ 'fontSize': '0.3rem' }} fill='grey' textAnchor='middle'>{quartile.toFixed(2)}</text>
          </Fragment>
        );
      })}
      {bondReports.map((bond, index) => {
        const x = xScale(bond.details.interestConst);
        const y = 8 + Math.random() * 4;
        const interestConstIndex = quartiles
          .findIndex(percentile => bond.details.interestConst <= percentile) - 1;
        const interestConstColorCode = interestConstPartColors[Math.max(interestConstIndex, 0)];
        const interestConstColorMarker = colorMarkers[interestConstColorCode];
        return (
          <circle key={index} cx={x} cy={y} r={0.75} stroke='grey' strokeWidth={0.2} fill={interestConstColorMarker?.backgroundColor} />
        );
      })}
    </svg>
  );
}

type BondInterestTypeStatParam = {
  interestVariableType: string;
  interestConstPercentiles: number[];
  bondReports: BondReport[];
}

function BondInterestTypeStat({ interestVariableType, interestConstPercentiles, bondReports }: BondInterestTypeStatParam): JSX.Element {
  return (
    <Paper sx={{
      pt: 0.5,
      textAlign: 'center',
      '& > div': {
        pb: 1,
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
      <InterestChart quartiles={interestConstPercentiles} bondReports={bondReports} />
    </Paper>
  );
}

type BondsListParam = {
  bondReports: BondReport[];
  bondTypeFilter: string;
  bondsStatistics: BondsStatistics;
}

export default function BondsListStats({ bondReports, bondTypeFilter, bondsStatistics }: BondsListParam): JSX.Element {
  const bondsByInterestBaseTypes = R.groupBy(interestVariable)(bondReports);
  const bondInterestBaseTypePercentiles = bondTypeFilter === 'all' ? bondsStatistics.all : bondsStatistics.byType[bondTypeFilter];
  console.log(bondInterestBaseTypePercentiles)
  console.log(bondTypeFilter)
  return (
    <Box>
      <Grid container spacing={1}>
        {sort(Object.keys(bondsByInterestBaseTypes)).map(interestBaseType => (
          <Grid key={interestBaseType} item xs={6} sm={4} md={3}>
            <BondInterestTypeStat
              interestConstPercentiles={bondInterestBaseTypePercentiles[interestBaseType]}
              interestVariableType={interestBaseType}
              bondReports={bondsByInterestBaseTypes[interestBaseType]} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}