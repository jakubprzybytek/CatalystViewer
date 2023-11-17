import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import Box from '@mui/material/Box';

type BondReportsBrowserSelectorParams = {
}

export default function BondReportsBrowserSelector({ }: BondReportsBrowserSelectorParams): JSX.Element {
  return (
    <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
      <Toolbar variant='dense'
        sx={{ '& > button.MuiButton-root': { fontSize: '1.2rem', minWidth: '2rem', height: '2rem', border: '2px solid #fff', borderRadius: '50%', mr: 1 } }}>
        <Button color="inherit">1</Button>
        <Button color="inherit">2</Button>
        <IconButton color="inherit">
          <AddCircleOutlineIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
