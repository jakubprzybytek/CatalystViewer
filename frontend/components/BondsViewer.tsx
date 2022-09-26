import { useEffect, useState, useMemo } from 'react';
import * as R from 'ramda';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import BondsList from './BondsList';
import { getBonds, BondReport } from '../sdk/GetBonds';
import { BondDetails } from '../../services/bonds';

const getBondDetailProp = (prop: 'type' | 'issuer') => R.compose(R.prop(prop), R.prop<'details', BondDetails>('details'));

export default function EventsBrowser(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [bonds, setBonds] = useState<BondReport[]>([]);

  const [bondTypeFilter, setBondTypeFilter] = useState<string>('all');
  const [issuerFilter, setIssuerFilter] = useState<string>('all');

  const bondTypes = useMemo(() => R.uniq(R.map(getBondDetailProp('type'), bonds)), [bonds])
  const issuers = useMemo(() => R.sortBy(R.identity, R.uniq(R.map(getBondDetailProp('issuer'), bonds))), [bonds]);

  let filteredBonds = bondTypeFilter !== 'all' ? R.filter((bondReport) => bondReport.details.type === bondTypeFilter, bonds) : bonds;
  filteredBonds = issuerFilter !== 'all' ? R.filter((bondReport) => bondReport.details.issuer === issuerFilter, filteredBonds) : filteredBonds;

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      const bonds = await getBonds();
      setBonds(bonds);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <>
      <Paper sx={{
        p: 1,
        m: 1,
        '& > *': {
          mt: 1
        }
      }}>
        <TextField label="Bond type" size="small" fullWidth select
          value={bondTypeFilter}
          onChange={(event: any) => setBondTypeFilter(event.target.value)}>
          <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
          {bondTypes.map((bondType) => (
            <MenuItem key={bondType} value={bondType}>{bondType}</MenuItem>
          ))}
        </TextField>
        <TextField label="Issuer" size="small" fullWidth select
          value={issuerFilter}
          onChange={(event: any) => setIssuerFilter(event.target.value)}>
          <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
          {issuers.map((issuer) => (
            <MenuItem key={issuer} value={issuer}>{issuer}</MenuItem>
          ))}
        </TextField>
        <Typography>Listing {filteredBonds.length} bonds</Typography>
      </Paper>
      {isLoading && <CircularProgress />}
      <BondsList bondReports={filteredBonds} />
    </>
  );
}