import { useRef, useState } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { BondReportsBrowserSettings, DEFAULT_FILTERIN_OPTIONS_SETTING, DEFAULT_SORT_ORDER_SETTING, DEFAULT_VIEW_SETTING } from './BondReportsBrowser';
import Condition from '@/common/Condition';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import { removeAt } from '@/common/Arrays';

type SelectorItemParams = {
  settings: BondReportsBrowserSettings;
  active: boolean;
  setActive: () => void;
  setInEdit: () => void;
}

function SelectorItem({ settings, active, setActive, setInEdit }: SelectorItemParams): JSX.Element {
  return (
    <Button color="primary" variant={active ? 'contained' : 'outlined'}
      onClick={active ? setInEdit : setActive}>
      {settings.name}
    </Button>
  )
}

type EditorItemParams = {
  settings: BondReportsBrowserSettings;
  setSettings: (settings: BondReportsBrowserSettings) => void;
  onCopy: (settings: BondReportsBrowserSettings) => void;
  deleteEnabled: boolean;
  onDelete: () => void;
  exitEdit: () => void;
}

function EditorItem({ settings, setSettings, onCopy, deleteEnabled, onDelete, exitEdit }: EditorItemParams): JSX.Element {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const nameRef = useRef<TextFieldProps>();

  return (
    <Stack direction="row">
      <TextField color='primary' size="small" sx={{ width: '7rem', height: '1rem' }}
        inputRef={nameRef}
        defaultValue={settings.name} />
      <IconButton title='Save' color='primary'
        onClick={() => { setSettings({ ...settings, name: (nameRef.current?.value || 'name') as string }); exitEdit(); }}>
        <SaveIcon />
      </IconButton>
      <IconButton title='Copy as new' color='primary'
        onClick={() => { onCopy(settings); exitEdit(); }}>
        <ContentCopyIcon />
      </IconButton>
      <IconButton title='Delete' color='primary'
        disabled={!deleteEnabled}
        onClick={() => setConfirmDialogOpen(true)}>
        <DeleteIcon />
      </IconButton>
      <IconButton title='Cancel' color='primary'
        onClick={exitEdit}>
        <CancelIcon />
      </IconButton>
      <Dialog open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>{"Delete tab"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure to delete this tab?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => { setConfirmDialogOpen(false); onDelete(); exitEdit(); }} autoFocus>Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

const NEW_BOND_REPORTS_SETTINGS: BondReportsBrowserSettings = {
  name: 'New',
  view: DEFAULT_VIEW_SETTING,
  filteringOptions: DEFAULT_FILTERIN_OPTIONS_SETTING,
  sortOrder: DEFAULT_SORT_ORDER_SETTING
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

  function handleCreateNew() {
    setSettingsCollection([...settingsCollection, NEW_BOND_REPORTS_SETTINGS]);
    setCurrentSettingsIndex(settingsCollection.length);
  }

  function handleCopy(settings: BondReportsBrowserSettings) {
    setSettingsCollection([...settingsCollection, { ...settings, name: settings.name + " copy" }]);
    setCurrentSettingsIndex(settingsCollection.length);
  }

  function handleDelete() {
    if (settingsInEditIndex !== undefined) {
      setSettingsCollection(removeAt(settingsCollection, settingsInEditIndex));
      setCurrentSettingsIndex(currentSettingsIndex > 0 ? currentSettingsIndex - 1 : 0);
    }
  }

  return (
    <>
      <AppBar component="footer" position="fixed" color="default" sx={{ top: 'auto', bottom: 0 }}>
        <Toolbar variant='dense'
          sx={{
            justifyContent: 'center',
            '& > button.MuiButton-root': { textTransform: 'none', fontSize: '0.9rem', lineHeight: '1rem', height: '2.3rem', borderWidth: '1px', borderStyle: 'solid', borderColor: 'primary.main', borderRadius: 3, mr: 1 },
            '& .MuiOutlinedInput-root': { mt: 0.5, height: '2rem', borderRadius: 3 },
            '& > button.MuiIconButton-root': { pl: 1 }
          }}>
          {settingsInEditIndex !== undefined && (
            <EditorItem settings={settingsCollection[settingsInEditIndex]} setSettings={getSetSettings(settingsInEditIndex)}
              onCopy={handleCopy}
              deleteEnabled={settingsCollection.length > 1}
              onDelete={handleDelete}
              exitEdit={() => setSettingsInEditIndex(undefined)} />
          )}
          <Condition render={settingsInEditIndex === undefined}>
            <>
              {settingsCollection.map((settings, index) => (
                <SelectorItem key={index} settings={settings} active={index === currentSettingsIndex}
                  setActive={() => setCurrentSettingsIndex(index)}
                  setInEdit={() => setSettingsInEditIndex(index)} />
              ))}
              <IconButton onClick={handleCreateNew}>
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
