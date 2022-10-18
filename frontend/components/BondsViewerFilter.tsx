import { useEffect, useState, useMemo } from 'react';
import * as R from 'ramda';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { BondReport, BondDetails } from '../sdk/GetBonds';
import { useArrayLocalStorage, useLocalStorage } from '../common/UseStorage';

const bondDetailsProps = (prop: 'market' | 'type' | 'issuer') => R.map(R.compose(R.prop(prop), R.prop<'details', BondDetails>('details')));
const sort = R.sortBy<string>(R.identity);

const isOnMarkets = (markets: string[]) => (bondReport: BondReport) => markets.includes(bondReport.details.market);
const isBondType = (type: string) => type !== 'all' ? (bondReport: BondReport) => bondReport.details.type === type : R.always(true);
const isIssuedBy = (issuer: string) => issuer !== 'all' ? (bondReport: BondReport) => bondReport.details.issuer === issuer : R.always(true);
const nominalValueLessThan = (maxNominalValue: number) => (bondReport: BondReport) => bondReport.details.nominalValue <= maxNominalValue;

const filterByType = (type: string) => R.filter(isBondType(type));
const filterByIssuer = (issuer: string) => R.filter(isIssuedBy(issuer));

const filterBonds = (markets: string[], type: string, issuer: string, maxNominalValue: number) =>
  R.filter(R.allPass([isBondType(type), isIssuedBy(issuer), isOnMarkets(markets), nominalValueLessThan(maxNominalValue)]));

type BondsViewerFilterParams = {
  allBondReports: BondReport[];
  setBondTypeFilter: (bondTypeFilter: string) => void;
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

const defaultMarkets = ['GPW RR', 'GPW ASO'];

export default function BondsViewerFilter({ allBondReports, setBondTypeFilter: setBondTypeFilter2, setFilteredBondReports: setFilteredBonds }: BondsViewerFilterParams): JSX.Element {
  const [bondTypeFilter, setBondTypeFilter] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');
  const [issuerFilter, setIssuerFilter] = useLocalStorage('filter.issuer', 'all');
  const [marketsFilter, addMarketFilter, removeMarketFilter] = useArrayLocalStorage<string>('filter.market', defaultMarkets);
  const [maxNominalFilter, setMaxNominalFilter] = useLocalStorage<number>('filter.maxNominalValue', 10000);

  const allMarkets = useMemo(() => sort(R.uniq(bondDetailsProps('market')(allBondReports))), [allBondReports]);

  const availableBondTypes = useMemo(() => {
    const filteredByIssuer = filterByIssuer(issuerFilter)(allBondReports);
    return R.uniq(bondDetailsProps('type')(filteredByIssuer));
  }, [allBondReports, issuerFilter]);

  const availableIssuers = useMemo(() => {
    const filteredByType = filterByType(bondTypeFilter)(allBondReports);
    return sort(R.uniq(bondDetailsProps('issuer')(filteredByType)));
  }, [allBondReports, bondTypeFilter]);

  const filteredBonds = useMemo(() => filterBonds(marketsFilter, bondTypeFilter, issuerFilter, maxNominalFilter)(allBondReports),
    [allBondReports, marketsFilter, issuerFilter, bondTypeFilter, maxNominalFilter]);

  useEffect(() => setFilteredBonds(filteredBonds), [setFilteredBonds, filteredBonds]);

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
            <FormLabel>Issuers</FormLabel>
            <TextField label="Issuer" size="small" fullWidth select
              value={availableIssuers.includes(issuerFilter) ? issuerFilter : ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIssuerFilter(event.target.value)}>
              <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
              {availableIssuers.map((issuer) => (
                <MenuItem key={issuer} value={issuer}>{issuer}</MenuItem>
              ))}
            </TextField>
            <Stack direction='row'>
              <Chip label={issuerFilter} onDelete={() => { }} />
            </Stack>
          </FormControl>
        </Grid>
      </Grid>
      <Typography sx={{ ml: 2, mt: 2 }}>Listing {filteredBonds.length} bonds</Typography>
    </Paper>
  );
}