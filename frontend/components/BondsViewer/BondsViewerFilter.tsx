import { useState, useEffect, useMemo } from 'react';
import * as R from 'ramda';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Check from '@mui/icons-material/Check';
import AddCircle from '@mui/icons-material/AddCircle';
import { BondReport, BondDetails } from '../../sdk/GetBonds';
import { useArrayLocalStorage } from '../../common/UseStorage';

const bondDetailsProps = (prop: 'market' | 'type' | 'issuer') => R.map(R.compose(R.prop(prop), R.prop<'details', BondDetails>('details')));
const bondName = (bondReport: BondReport) => bondReport.details.name;
const sort = R.sortBy<string>(R.identity);
const sortByName = R.sortBy(bondName);

const isIssuedBy = (issuers: string[]) => issuers.length > 0 ? (bondReport: BondReport) => issuers.includes(bondReport.details.issuer) : R.always(true);

type BondsViewerFilterParams = {
  allBondReports: BondReport[];
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

const defaultIssuers: string[] = [];

export default function BondsViewerFilter({ allBondReports, setFilteredBondReports }: BondsViewerFilterParams): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const [issuersFilter, addIssuerFilter, removeIssuerFilter] = useArrayLocalStorage('filter.issuer', defaultIssuers);

  const availableIssuers = useMemo(() => {
    return sort(R.uniq(bondDetailsProps('issuer')(allBondReports)));
  }, [allBondReports]);

  const filteredBonds = useMemo(() => R.filter(isIssuedBy(issuersFilter))(allBondReports), [allBondReports, issuersFilter]);

  useEffect(() => {
    setFilteredBondReports(sortByName(filteredBonds));
  }, [setFilteredBondReports, filteredBonds]);

  return (
    <Paper sx={{ p: 1 }}>
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
      </Grid>
      <Typography sx={{ mt: 2 }}>Listing {filteredBonds.length} bonds</Typography>
    </Paper >
  );
}