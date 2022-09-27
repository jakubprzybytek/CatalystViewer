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

const collectBondDetailProps = (prop: 'type' | 'issuer') => R.map(R.compose(R.prop(prop), R.prop<'details', BondDetails>('details')));
const sort = R.sortBy<string>(R.identity);

const isBondType = (type: string) => type !== 'all' ? (bondReport: BondReport) => bondReport.details.type === type : R.always(true);
const isIssuedBy = (issuer: string) => issuer !== 'all' ? (bondReport: BondReport) => bondReport.details.issuer === issuer : R.always(true);

const filterByType = (type: string) => R.filter(isBondType(type));
const filterByIssuer = (issuer: string) => R.filter(isIssuedBy(issuer));

const filterBonds = (type: string, issuer: string) => R.filter(R.both(isBondType(type), isIssuedBy(issuer)));

export default function EventsBrowser(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [bonds, setBonds] = useState<BondReport[]>([]);

  const [bondTypeFilter, setBondTypeFilter] = useState<string>('all');
  const [issuerFilter, setIssuerFilter] = useState<string>('all');

  const availableBondTypes = useMemo(() => {
    const filteredByIssuer = filterByIssuer(issuerFilter)(bonds);
    return R.uniq(collectBondDetailProps('type')(filteredByIssuer));
  }, [bonds, issuerFilter]);

  const availableIssuers = useMemo(() => {
    const filteredByType = filterByType(bondTypeFilter)(bonds);
    return sort(R.uniq(collectBondDetailProps('issuer')(filteredByType)));
  }, [bonds, bondTypeFilter]);

  const filteredBonds = filterBonds(bondTypeFilter, issuerFilter)(bonds);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      const bonds = await getBonds();
      setIsLoading(false);
      setBonds(bonds);
    };

    fetchData();
  }, []);

  return (
    <>
      <Paper sx={{
        p: 1,
        m: 1,
        '& > div': {
          mt: 1
        }
      }}>
        <TextField label="Bond type" size="small" fullWidth select
          value={bondTypeFilter}
          onChange={(event: any) => setBondTypeFilter(event.target.value)}>
          <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
          {availableBondTypes.map((bondType) => (
            <MenuItem key={bondType} value={bondType}>{bondType}</MenuItem>
          ))}
        </TextField>
        <TextField label="Issuer" size="small" fullWidth select
          value={issuerFilter}
          onChange={(event: any) => setIssuerFilter(event.target.value)}>
          <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
          {availableIssuers.map((issuer) => (
            <MenuItem key={issuer} value={issuer}>{issuer}</MenuItem>
          ))}
        </TextField>
        <Typography sx={{ ml: 2, mt: 2 }}>Listing {filteredBonds.length} bonds</Typography>
      </Paper>
      {isLoading && <CircularProgress />}
      <BondsList bondReports={filteredBonds} />
    </>
  );
}