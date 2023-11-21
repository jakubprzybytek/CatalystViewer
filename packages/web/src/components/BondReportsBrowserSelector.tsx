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
    <AppBar component="footer" position="fixed" color="default" sx={{ top: 'auto', bottom: 0 }}>
      <Toolbar variant='dense'
        sx={{
          justifyContent: 'center',
          '& > button.MuiButton-root': { textTransform: 'none', fontSize: '1rem', minWidth: '2rem', height: '2rem', border: '1.8px solid #000', borderRadius: 3, mr: 1 }
        }}>
        <Button color="inherit">Hello</Button>
        <Button color="inherit">World</Button>
        <IconButton color="inherit">
          <AddCircleOutlineIcon fontSize='large' color='action'/>
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
