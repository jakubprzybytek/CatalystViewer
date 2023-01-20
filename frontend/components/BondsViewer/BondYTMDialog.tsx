import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import CloseIcon from '@mui/icons-material/Close';
import { useMediaQuery, useTheme } from "@mui/material";
import { YieldToMaturityReport } from "../../bonds/YieldToMaturity";
import { formatCurrency } from "../../common/Formats";

type ReportEntryParam = {
  caption: string;
  children: React.ReactNode;
}

function ReportEntry({ caption, children }: ReportEntryParam): JSX.Element {
  return (
    <Stack direction='row'>
      <Typography component='span' variant='caption' sx={{ width: 120 }}>{caption}</Typography>
      <Typography component='span'>{children}</Typography>
    </Stack>
  );
}

type BondYTMReportDialogParam = {
  ytmReport: YieldToMaturityReport;
  onClose: () => void;
}

export default function BondYTMReportDialog({ ytmReport, onClose }: BondYTMReportDialogParam): JSX.Element {
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
      <DialogContent>
        <Grid container direction='row' spacing={2}>
          <Grid item xs={12} sm={6}>
            <ReportEntry caption='Buying price'>{formatCurrency(ytmReport.buyingPrice, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Buying commision'>{formatCurrency(ytmReport.buyingCommision, ytmReport.currency)}</ReportEntry>
            <Divider sx={{ mt: 0.5, mb: 1 }} />
            <ReportEntry caption='Total buying price'>{formatCurrency(ytmReport.totalBuyingPrice, ytmReport.currency)}</ReportEntry>
          </Grid>
          <Grid item xs={12} sm={6}>
            <ReportEntry caption='Total interest'>{formatCurrency(ytmReport.totalInterests, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Interest tax'>{formatCurrency(ytmReport.interestsTax, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Sale profit'>{formatCurrency(ytmReport.saleProfit, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Sale tax'>{formatCurrency(ytmReport.saleTax, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Total sale income'>{formatCurrency(ytmReport.totalSaleIncome, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Total sale costs'>{formatCurrency(ytmReport.totalSaleCosts, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Total sale profit'>{formatCurrency(ytmReport.totalSaleProfit, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='Profit'>{formatCurrency(ytmReport.profit, ytmReport.currency)}</ReportEntry>
            <ReportEntry caption='YTM'>{formatCurrency(ytmReport.ytm, ytmReport.currency)}</ReportEntry>
          </Grid>
        </Grid>
        Hello {ytmReport.ytm}
      </DialogContent>
    </Dialog>
  );
}