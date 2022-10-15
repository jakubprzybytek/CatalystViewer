import { useEffect, useState, useMemo } from 'react';
import * as R from 'ramda';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { BondReport, BondDetails } from '../sdk/GetBonds';

function removeFromArray(array: string[], element: string): string[] {
  const index = array.indexOf(element, 0);
  const duplicate = [...array];
  if (index > -1) {
    duplicate.splice(index, 1);
  }
  return duplicate;
}

const bondDetailsProps = (prop: 'market' | 'type' | 'issuer') => R.map(R.compose(R.prop(prop), R.prop<'details', BondDetails>('details')));
const sort = R.sortBy<string>(R.identity);

const isOnMarkets = (markets: string[]) => (bondReport: BondReport) => markets.includes(bondReport.details.market);
const isBondType = (type: string) => type !== 'all' ? (bondReport: BondReport) => bondReport.details.type === type : R.always(true);
const isIssuedBy = (issuer: string) => issuer !== 'all' ? (bondReport: BondReport) => bondReport.details.issuer === issuer : R.always(true);

const filterByType = (type: string) => R.filter(isBondType(type));
const filterByIssuer = (issuer: string) => R.filter(isIssuedBy(issuer));

const filterBonds = (markets: string[], type: string, issuer: string) => R.filter(R.allPass([isBondType(type), isIssuedBy(issuer), isOnMarkets(markets)]));

type BondsViewerFilterParams = {
  allBondReports: BondReport[];
  setBondTypeFilter: (bondTypeFilter: string) => void;
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

export default function BondsViewerFilter({ allBondReports, setBondTypeFilter: setBondTypeFilter2, setFilteredBondReports: setFilteredBonds }: BondsViewerFilterParams): JSX.Element {
  const [bondTypeFilter, setBondTypeFilter] = useState<string>('Corporate bonds');
  const [issuerFilter, setIssuerFilter] = useState<string>('all');
  const [marketsFilter, setMarketsFilter] = useState<string[]>(['GPW RR', 'GPW ASO']);

  const allMarkets = useMemo(() => sort(R.uniq(bondDetailsProps('market')(allBondReports))), [allBondReports]);

  const availableBondTypes = useMemo(() => {
    const filteredByIssuer = filterByIssuer(issuerFilter)(allBondReports);
    return R.uniq(bondDetailsProps('type')(filteredByIssuer));
  }, [allBondReports, issuerFilter]);

  const availableIssuers = useMemo(() => {
    const filteredByType = filterByType(bondTypeFilter)(allBondReports);
    return sort(R.uniq(bondDetailsProps('issuer')(filteredByType)));
  }, [allBondReports, bondTypeFilter]);

  const filteredBonds = useMemo(() => filterBonds(marketsFilter, bondTypeFilter, issuerFilter)(allBondReports),
    [allBondReports, marketsFilter, issuerFilter, bondTypeFilter]);

  useEffect(() => setFilteredBonds(filteredBonds), [setFilteredBonds, filteredBonds]);

  return (
    <Paper sx={{ p: 1 }}>
      <FormLabel component="legend">Market</FormLabel>
      <FormGroup row>
        {allMarkets.map((market) => (
          <FormControlLabel key={market} control={
            <Checkbox
              checked={marketsFilter.includes(market)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMarketsFilter(event.target.checked ? [...marketsFilter, market] : removeFromArray(marketsFilter, market))} />
          } label={market} />
        ))}
      </FormGroup>
      <Grid container spacing={1}>
        <Grid item xs={12} md={6}>
          <TextField label="Bond type" size="small" fullWidth select
            value={bondTypeFilter}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => { setBondTypeFilter(event.target.value); setBondTypeFilter2(event.target.value); }}>
            <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
            {availableBondTypes.map((bondType) => (
              <MenuItem key={bondType} value={bondType}>{bondType}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label="Issuer" size="small" fullWidth select
            value={issuerFilter}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIssuerFilter(event.target.value)}>
            <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
            {availableIssuers.map((issuer) => (
              <MenuItem key={issuer} value={issuer}>{issuer}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
      <Typography sx={{ ml: 2, mt: 2 }}>Listing {filteredBonds.length} bonds</Typography>
    </Paper>
  );
}