import { useState, useEffect, useMemo } from 'react';
import * as R from 'ramda';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Check from '@mui/icons-material/Check';
import AddCircle from '@mui/icons-material/AddCircle';
import { BondReport, BondDetails } from '../../sdk/GetBonds';
import { useArrayLocalStorage, useLocalStorage } from '../../common/UseStorage';

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

// const filterBonds = (markets: string[], type: string, issuers: string[], maxNominalValue: number) =>
//   R.filter(R.allPass([isBondType(type), isIssuedBy(issuers), isOnMarkets(markets), nominalValueLessThan(maxNominalValue)]));
const filterBonds = (markets: string[], issuers: string[], maxNominalValue: number) =>
  R.filter(R.allPass([isIssuedBy(issuers), isOnMarkets(markets), nominalValueLessThan(maxNominalValue)]));

type BondsViewerFilterParams = {
  allBondReports: BondReport[];
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

const defaultIssuers: string[] = [];
const defaultMarkets = ['GPW RR', 'GPW ASO'];

export default function BondsViewerFilter({ allBondReports, setFilteredBondReports: setFilteredBonds }: BondsViewerFilterParams): JSX.Element {
  const [moreFiltersExpanded, setMoreFiltersExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  //const [bondTypeFilter, setBondTypeFilter] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');
  const [issuersFilter, addIssuerFilter, removeIssuerFilter] = useArrayLocalStorage('filter.issuer', defaultIssuers);
  const [marketsFilter, addMarketFilter, removeMarketFilter] = useArrayLocalStorage<string>('filter.market', defaultMarkets);
  const [maxNominalFilter, setMaxNominalFilter] = useLocalStorage<number>('filter.maxNominalValue', 10000);

  const allMarkets = useMemo(() => sort(R.uniq(bondDetailsProps('market')(allBondReports))), [allBondReports]);

  // const availableBondTypes = useMemo(() => {
  //   //const filteredByIssuer = filterByIssuer(issuerFilter)(allBondReports);
  //   return R.uniq(bondDetailsProps('type')(allBondReports));
  // }, [allBondReports]);

  const availableIssuers = useMemo(() => {
    //const filteredByType = filterByType(bondTypeFilter)(allBondReports);
    return sort(R.uniq(bondDetailsProps('issuer')(allBondReports)));
  }, [allBondReports]);

  const filteredBonds = useMemo(() => filterBonds(marketsFilter, issuersFilter, maxNominalFilter)(allBondReports),
    [allBondReports, marketsFilter, issuersFilter, maxNominalFilter]);

  useEffect(() => {
    setFilteredBonds(sortByName(filteredBonds));
  }, [setFilteredBonds, filteredBonds]);

  return (
    <Paper sx={{ p: 1 }}>
      {/* <Grid container item xs={12} sm={6} md={4}>
        <FormControl fullWidth>
          <TextField label="Bond type" size="small" fullWidth select
            value={availableBondTypes.includes(bondTypeFilter) ? bondTypeFilter : ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBondTypeFilter(event.target.value)}>
            <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
            {availableBondTypes.map((bondType) => (
              <MenuItem key={bondType} value={bondType}>{bondType}</MenuItem>
            ))}
          </TextField>
        </FormControl>
      </Grid> */}
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Button startIcon={(<AddCircle />)}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)}>
            Select Issuers
          </Button>
          <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
            {availableIssuers.map(issuer =>
              issuersFilter.includes(issuer) ?
                (<MenuItem key={issuer} onClick={() => removeIssuerFilter(issuer)}>
                  <ListItemIcon><Check /></ListItemIcon>
                  {issuer}
                </MenuItem>)
                : (<MenuItem key={issuer} onClick={() => addIssuerFilter(issuer)}>
                  <ListItemText inset>{issuer}</ListItemText>
                </MenuItem>)
            )}
          </Menu>
          <Stack direction='row' flexWrap='wrap' sx={{
            '& > div': {
              mr: 1,
              mb: 1
            }
          }}>
            {issuersFilter && issuersFilter.map(issuer =>
              <Chip key={issuer} label={issuer} size='small'
                onDelete={() => { removeIssuerFilter(issuer) }} />
            )}
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Link sx={{ cursor: 'pointer' }}
            onClick={() => setMoreFiltersExpanded(!moreFiltersExpanded)}>
            {moreFiltersExpanded ? 'Less filters' : 'More filters'}
          </Link>
        </Grid>
      </Grid>
      <Collapse in={moreFiltersExpanded}>
        <Grid container spacing={1} marginTop={1}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <TextField label="Max nominal value" size="small" fullWidth select
                value={maxNominalFilter}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMaxNominalFilter(Number.parseInt(event.target.value))}>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={1000}>1000</MenuItem>
                <MenuItem value={10000}>10 000</MenuItem>
                <MenuItem value={100000}>100 000</MenuItem>
                <MenuItem value={1000000}>1 000 000</MenuItem>
              </TextField>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
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
          </Grid>
        </Grid>
      </Collapse>
      <Typography sx={{ mt: 2 }}>Listing {filteredBonds.length} bonds</Typography>
    </Paper >
  );
}