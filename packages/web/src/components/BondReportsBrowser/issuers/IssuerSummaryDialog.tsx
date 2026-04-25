import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { industryChipSx } from "./IssuerCard";

type IssuerSummaryDialogParams = {
  issuerName: string;
  industry: string;
  businessSummary: string;
  open: boolean;
  onClose: () => void;
}

export default function IssuerSummaryDialog({ issuerName, industry, businessSummary, open, onClose }: IssuerSummaryDialogParams): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{issuerName}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Chip label={industry} size="small" variant="outlined" sx={industryChipSx(industry)} />
          <Typography variant="body2">{businessSummary}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
