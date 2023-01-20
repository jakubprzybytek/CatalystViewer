import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Check from '@mui/icons-material/Check';
import AddCircle from '@mui/icons-material/AddCircle';
import RemoveCircle from '@mui/icons-material/RemoveCircle';

type BondsViewerFilterParams = {
  allIssuers: string[];
  selectedIssuers: string[];
  addIssuer: (issuer: string) => void;
  removeIssuer: (issuer: string) => void;
  removeAllIssuers: () => void;
};

export default function BondsViewerFilter({ allIssuers, selectedIssuers, addIssuer, removeIssuer, removeAllIssuers }: BondsViewerFilterParams): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <Paper sx={{ p: 1 }}>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Button startIcon={(<AddCircle />)}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)}>
            Select Issuers
          </Button>
          <Button startIcon={(<RemoveCircle />)} disabled={selectedIssuers.length === 0}
            onClick={removeAllIssuers}>
            Remove all
          </Button>
          <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
            {allIssuers.map(issuer =>
              selectedIssuers.includes(issuer) ?
                (<MenuItem key={issuer} onClick={() => removeIssuer(issuer)}>
                  <ListItemIcon><Check /></ListItemIcon>
                  {issuer}
                </MenuItem>)
                : (<MenuItem key={issuer} onClick={() => addIssuer(issuer)}>
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
            {selectedIssuers && selectedIssuers.map(issuer =>
              <Chip key={issuer} label={issuer} size='small'
                onDelete={() => { removeIssuer(issuer) }} />
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}