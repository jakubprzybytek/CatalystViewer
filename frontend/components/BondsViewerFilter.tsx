import { useEffect, useMemo } from 'react';
import * as R from 'ramda';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { BondReport, BondDetails } from '../sdk/GetBonds';
import { useArrayLocalStorage, useLocalStorage } from '../common/UseStorage';

const bondDetailsProps = (prop: 'market' | 'type' | 'issuer') => R.map(R.compose(R.prop(prop), R.prop<'details', BondDetails>('details')));
const bondName = (bondReport: BondReport) => bondReport.details.name;
const sort = R.sortBy<string>(R.identity);
const sortByName = R.sortBy(bondName);

const isOnMarkets = (markets: string[]) => (bondReport: BondReport) => markets.includes(bondReport.details.market);
const isBondType = (type: string) => type !== 'all' ? (bondReport: BondReport) => bondReport.details.type === type : R.always(true);
const isIssuedBy = (issuers: string[]) => issuers.length > 0 ? (bondReport: BondReport) => issuers.includes(bondReport.details.issuer) : R.always(true);
const nominalValueLessThan = (maxNominalValue: number) => (bondReport: BondReport) => bondReport.details.nominalValue <= maxNominalValue;

const filterByType = (type: string) => R.filter(isBondType(type));
//const filterByIssuer = (issuer: string) => R.filter(isIssuedBy(issuer));

const filterBonds = (markets: string[], type: string, issuers: string[], maxNominalValue: number) =>
  R.filter(R.allPass([isBondType(type), isIssuedBy(issuers), isOnMarkets(markets), nominalValueLessThan(maxNominalValue)]));

type BondsViewerFilterParams = {
  allBondReports: BondReport[];
  setBondTypeFilter: (bondTypeFilter: string) => void;
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

const defaultIssuers: string[] = [];
const defaultMarkets = ['GPW RR', 'GPW ASO'];

export default function BondsViewerFilter({ allBondReports, setBondTypeFilter: setBondTypeFilter2, setFilteredBondReports: setFilteredBonds }: BondsViewerFilterParams): JSX.Element {
  const [bondTypeFilter, setBondTypeFilter] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');
  const [issuersFilter, addIssuerFilter, removeIssuerFilter] = useArrayLocalStorage('filter.issuer', defaultIssuers);
  const [marketsFilter, addMarketFilter, removeMarketFilter] = useArrayLocalStorage<string>('filter.market', defaultMarkets);
  const [maxNominalFilter, setMaxNominalFilter] = useLocalStorage<number>('filter.maxNominalValue', 10000);

  const allMarkets = useMemo(() => sort(R.uniq(bondDetailsProps('market')(allBondReports))), [allBondReports]);

  const availableBondTypes = useMemo(() => {
    //const filteredByIssuer = filterByIssuer(issuerFilter)(allBondReports);
    return R.uniq(bondDetailsProps('type')(allBondReports));
  }, [allBondReports, issuersFilter]);

  const availableIssuers = useMemo(() => {
    const filteredByType = filterByType(bondTypeFilter)(allBondReports);
    return sort(R.uniq(bondDetailsProps('issuer')(filteredByType)));
  }, [allBondReports, bondTypeFilter]);

  const filteredBonds = useMemo(() => filterBonds(marketsFilter, bondTypeFilter, issuersFilter, maxNominalFilter)(allBondReports),
    [allBondReports, marketsFilter, issuersFilter, bondTypeFilter, maxNominalFilter]);

  useEffect(() => setFilteredBonds(sortByName(filteredBonds)), [setFilteredBonds, filteredBonds]);

  return (
    <Paper sx={{ p: 1 }}>
      <Grid container spacing={1}>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1}>
            <FormControl fullWidth>
              <TextField label="Bond type" size="small" fullWidth select
                value={availableBondTypes.includes(bondTypeFilter) ? bondTypeFilter : ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => { setBondTypeFilter(event.target.value); setBondTypeFilter2(event.target.value); }}>
                <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
                {availableBondTypes.map((bondType) => (
                  <MenuItem key={bondType} value={bondType}>{bondType}</MenuItem>
                ))}
              </TextField>
            </FormControl>
            <FormControl fullWidth>
              <TextField label="Max nominal value" size="small" fullWidth select
                value={maxNominalFilter}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMaxNominalFilter(Number.parseInt(event.target.value))}>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={1000}>1000</MenuItem>
                <MenuItem value={10000}>10 000</MenuItem>
                <MenuItem value={100000}>100 000</MenuItem>
              </TextField>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel component="legend">Market</FormLabel>
              <FormGroup row>
                {allMarkets.map((market) => (
                  <FormControlLabel key={market} control={
                    <Checkbox
                      checked={marketsFilter.includes(market)}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => event.target.checked ? addMarketFilter(market) : removeMarketFilter(market)} />
                  } label={market} />
                ))}
              </FormGroup>
            </FormControl>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <Stack spacing={1}>
              <FormLabel>Issuers</FormLabel>
              <Select label="New" size="small" fullWidth
                value=''
                onChange={(event: SelectChangeEvent) => addIssuerFilter(event.target.value)}>
                {availableIssuers.map((issuer) => (
                  <MenuItem key={issuer} value={issuer}>{issuer}</MenuItem>
                ))}
              </Select>
              <Stack direction='row' spacing={1} flexWrap='wrap'>
                {issuersFilter && issuersFilter.map(issuer =>
                  <Chip key={issuer} label={issuer} onDelete={() => { removeIssuerFilter(issuer) }} />
                )}
              </Stack>
            </Stack>
          </FormControl>
        </Grid>
      </Grid>
      <Typography sx={{ ml: 2, mt: 2 }}>Listing {filteredBonds.length} bonds</Typography>
    </Paper >
  );
}