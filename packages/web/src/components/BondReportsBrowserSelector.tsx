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
import Condition from '@/common/Condition';

type SelectorItemParams = {
  settings: BondReportsBrowserSettings;
  active: boolean;
  setActive: () => void;
  setInEdit: () => void;
}

function SelectorItem({ settings, active, setActive, setInEdit }: SelectorItemParams): JSX.Element {
  if (active) {
    return (
      <Button color="primary" className='active' onClick={setInEdit}>{settings.name}</Button>
    )
  }
  else {
    return (
      <Button color="primary" onClick={setActive}>{settings.name}</Button>
    )
  }
}

type EditorItemParams = {
  settings: BondReportsBrowserSettings;
  setSettings: (settings: BondReportsBrowserSettings) => void;
  onCancel: () => void;
}

function EditorItem({ settings, setSettings, onCancel }: EditorItemParams): JSX.Element {
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
      <IconButton onClick={onCancel}>
        <CancelIcon color='primary' />
      </IconButton>
    </Stack>
  )
}

type BondReportsBrowserSelectorParams = {
  settingsCollection: BondReportsBrowserSettings[];
  setSettingsCollection: (settingsCollection: BondReportsBrowserSettings[]) => void;
  currentSettingsIndex: number;
  setCurrentSettingsIndex: (index: number) => void;
}

export default function BondReportsBrowserSelector({ settingsCollection, setSettingsCollection, currentSettingsIndex, setCurrentSettingsIndex }: BondReportsBrowserSelectorParams): JSX.Element {
  const [settingsInEditIndex, setSettingsInEditIndex] = useState<number | undefined>(undefined);

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
            '& .MuiOutlinedInput-root': { mt: 0.5, height: '2rem', borderRadius: 3 },
            '& > button.MuiIconButton-root': { pl: 1 }
          }}>
          {settingsInEditIndex !== undefined && (
            <EditorItem settings={settingsCollection[settingsInEditIndex]} setSettings={getSetSettings(settingsInEditIndex)} onCancel={() => setSettingsInEditIndex(undefined)} />
          )}
          <Condition render={settingsInEditIndex === undefined}>
            <>
              {settingsCollection.map((settings, index) => (
                <SelectorItem settings={settings} active={index === currentSettingsIndex}
                  setActive={() => setCurrentSettingsIndex(index)}
                  setInEdit={() => setSettingsInEditIndex(index)} />
              ))}
              <IconButton>
                <AddCircleOutlineIcon color='primary' />
              </IconButton>
            </>
          </Condition>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: 54 }} />
    </>
  )
}
