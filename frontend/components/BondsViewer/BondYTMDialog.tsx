import Grid from "@mui/material/Unstable_Grid2";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
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

type ReportSectionTitleParam = {
  children: React.ReactNode;
}

function ReportSectionTitle({ children }: ReportSectionTitleParam): JSX.Element {
  return (
    <Typography variant='subtitle2' pb={1}>{children}</Typography>
  );
}

type ReportEntryParam = {
  caption: string;
  strong?: boolean;
  children: React.ReactNode;
}

function ReportEntry({ caption, strong = false, children }: ReportEntryParam): JSX.Element {
  const fontWeight = strong ? 500 : 400;
  return (
    <Stack direction='row'>
      <Typography fontWeight={fontWeight} component='span' variant='caption' flexGrow={1} paddingRight={2}>{caption}</Typography>
      <Typography fontWeight={fontWeight} component='span' textAlign='end'>{children}</Typography>
    </Stack>
  );
}

type BondYTMReportDialogParam = {
  ytmReport: YieldToMaturityReport;
  onClose: () => void;
}

export default function BondYTMReportDialog({ ytmReport, onClose }: BondYTMReportDialogParam): JSX.Element {
  const { bondDetails, bondCurrentValues } = ytmReport;

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog fullScreen={fullScreen}
      open={true}>
      <DialogTitle sx={{ backgroundColor: '#eee' }}>
        Yeld to maturity of {bondDetails.name}
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
      <DialogContent sx={{ p: 2, backgroundColor: '#eee' }}>
        <Grid container direction='row' spacing={1}>
          <Grid xs={12} sm={6}>
            <Box sx={{ pr: 1, pl: 1 }}>
              <ReportSectionTitle>Parameters</ReportSectionTitle>
              <ReportEntry caption='Tax rate'>{ytmReport.taxRate * 100}%</ReportEntry>
              <ReportEntry caption='Commision rate'>{ytmReport.commissionRate * 100}%</ReportEntry>
            </Box>
          </Grid>
          <Grid xs={12} sm={6}>
            <Box sx={{ pr: 1, pl: 1 }}>
              <ReportSectionTitle>Bond details</ReportSectionTitle>
              <ReportEntry caption='Nominal value'>{formatCurrency(bondDetails.nominalValue, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Accured interest'>{formatCurrency(bondCurrentValues.accuredInterest, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Current interest rate'>{bondCurrentValues.interestRate}%</ReportEntry>
            </Box>
          </Grid>
          <Grid xs={12} sm={6}>
            <Box sx={{ p: 1, backgroundColor: 'lightpink', borderRadius: '8px' }}>
              <ReportSectionTitle>Buy</ReportSectionTitle>
              <ReportEntry caption='Buying price'>{formatCurrency(ytmReport.buyingPrice, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Buying commision'>{formatCurrency(ytmReport.buyingCommision, bondDetails.currency)}</ReportEntry>
              <Divider sx={{ mt: 0.5, mb: 1 }} />
              <ReportEntry caption='Total buying price' strong={true}>{formatCurrency(ytmReport.totalBuyingPrice, bondDetails.currency)}</ReportEntry>
            </Box>
          </Grid>
          <Grid xs={12} sm={6}>
            <Box sx={{ p: 1, backgroundColor: 'lightgreen', borderRadius: '8px' }}>
              <ReportSectionTitle>Payoff</ReportSectionTitle>
              <ReportEntry caption='Total interest'>{formatCurrency(ytmReport.totalInterests, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Interest tax'>{formatCurrency(ytmReport.interestsTax, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Sale profit'>{formatCurrency(ytmReport.saleProfit, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Sale tax'>{formatCurrency(ytmReport.saleTax, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Total sale income'>{formatCurrency(ytmReport.totalSaleIncome, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='Total sale costs'>{formatCurrency(ytmReport.totalSaleCosts, bondDetails.currency)}</ReportEntry>
              <Divider sx={{ mt: 0.5, mb: 1 }} />
              <ReportEntry caption='Total sale profit' strong={true}>{formatCurrency(ytmReport.totalSaleProfit, bondDetails.currency)}</ReportEntry>
            </Box>
          </Grid>
          <Grid xs={12} sm={6} smOffset={3}>
            <Box sx={{ p: 1, backgroundColor: 'lightgrey', borderRadius: '8px' }}>
              <ReportSectionTitle>Profit</ReportSectionTitle>
              <ReportEntry caption='Total profit'>{formatCurrency(ytmReport.profit, bondDetails.currency)}</ReportEntry>
              <ReportEntry caption='YTM' strong={true}>{(ytmReport.ytm * 100).toFixed(2)}%</ReportEntry>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}