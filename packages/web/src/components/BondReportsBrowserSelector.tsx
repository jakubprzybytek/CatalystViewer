import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { BondReportsBrowserSettings } from './BondReportsBrowser/BondReportsBrowser';

type BondReportsBrowserSelectorParams = {
  settingsCollection: BondReportsBrowserSettings[];
  currentSettingsIndex: number;
  setCurrentSettingsIndex: (index: number) => void;
}

export default function BondReportsBrowserSelector({ settingsCollection, currentSettingsIndex, setCurrentSettingsIndex }: BondReportsBrowserSelectorParams): JSX.Element {
  return (
    <>
      <AppBar component="footer" position="fixed" color="default" sx={{ top: 'auto', bottom: 0 }}>
        <Toolbar variant='dense'
          sx={{
            justifyContent: 'center',
            '& > button.MuiButton-root': { textTransform: 'none', fontSize: '1rem', minWidth: '2rem', height: '2rem', borderWidth: '1px', borderStyle: 'solid', borderColor: 'primary.main', borderRadius: 3, mr: 1 },
            '& > button.MuiButton-root.active': { fontWeight: 600, borderWidth: '1.8px' },
            '& > button.MuiIconButton-root': { pl: 0 }
          }}>
          {settingsCollection.map((settings, index) => (
            <Button color="primary" className={index === currentSettingsIndex ? 'active' : ''}
              onClick={() => setCurrentSettingsIndex(index)}>
              {settings.name}
            </Button>
          ))}
          <IconButton>
            <AddCircleOutlineIcon fontSize='large' color='primary' />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: 54 }} />
    </>
  )
}
