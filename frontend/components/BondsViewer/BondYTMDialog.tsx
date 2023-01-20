import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from '@mui/icons-material/Close';
import { useMediaQuery, useTheme } from "@mui/material";


type BondYTMReportDialogParam = {
  onClose: () => void;
}


export default function BondYTMReportDialog({ onClose }: BondYTMReportDialogParam): JSX.Element {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog fullScreen={fullScreen}
      open={true}>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Yeld to maturity of xxx
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      Hello
    </Dialog>
  );
}