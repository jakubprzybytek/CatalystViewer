import { KeyboardEventHandler, useState } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { BondReportsBrowserSettings } from './BondReportsBrowser/BondReportsBrowser';
import { Stack } from '@mui/material';

type SelectorItemParams = {
  settings: BondReportsBrowserSettings;
  setSettings: (settings: BondReportsBrowserSettings) => void;
  active: boolean;
  setActive: () => void;
}

function SelectorItem({ settings, setSettings, active, setActive }: SelectorItemParams): JSX.Element {
  const [inEdit, setInEdit] = useState(false);

  if (active) {
    if (inEdit) {
      return (
        <Stack direction="row">
          <TextField color='primary' size="small" sx={{ width: '5rem', height: '1rem' }}
            defaultValue={settings.name} />
          <IconButton>
            <SaveIcon color='primary' />
          </IconButton>
          <IconButton>
            <DeleteIcon color='primary' />
          </IconButton>
          <IconButton onClick={() => setInEdit(false)}>
            <CancelIcon color='primary' />
          </IconButton>
        </Stack>
      )
    } else {
      return (
        <Button color="primary" className='active'
          onClick={() => setInEdit(true)}>
          {settings.name}
        </Button>
      )
    }
  }
  else {
    return (
      <Button color="primary"
        onClick={() => setActive()}>
        {settings.name}
      </Button>
    )
  }
}


type BondReportsBrowserSelectorParams = {
  settingsCollection: BondReportsBrowserSettings[];
  setSettingsCollection: (settingsCollection: BondReportsBrowserSettings[]) => void;
  currentSettingsIndex: number;
  setCurrentSettingsIndex: (index: number) => void;
}

export default function BondReportsBrowserSelector({ settingsCollection, setSettingsCollection, currentSettingsIndex, setCurrentSettingsIndex }: BondReportsBrowserSelectorParams): JSX.Element {

  function getSetSettings(index: number) {
    return (settings: BondReportsBrowserSettings) => setSettingsCollection(settingsCollection.with(index, settings));
  }

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
            <SelectorItem settings={settings} setSettings={getSetSettings(index)} active={index === currentSettingsIndex} setActive={() => setCurrentSettingsIndex(index)} />
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
