import { useEffect, useState } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from '@mui/icons-material/Close';
import Condition from "@/common/Condition";
import { Legend, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, Line, ComposedChart, CartesianGrid, ReferenceLine, AreaChart, Area } from "recharts";
import { useMediaQuery, useTheme } from "@mui/material";
import { format, isAfter, isBefore, sub } from "date-fns";
import { BondQuote, getBondQuotes, BondReport } from "@/sdk";
import { getAsks, getBids, getClosePrices } from "@/bonds/statistics";
import { formatDate } from "@/common/Formats";
import { min, max } from "simple-statistics";

const dateFormatter = (date: number) => {
  return format(new Date(date), "dd.MM");
};

type CustomTooltipParam = {
  active: any;
  payload: any;
  label: any;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipParam) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1 }}>
        <Typography fontWeight={500}>{format(new Date(label), "dd.MM.yyyy")}</Typography>
        <Typography variant='body2'>Bid: {payload[1]?.value || 'N/A'}</Typography>
        <Typography variant='body2'>Ask: {payload[2]?.value || 'N/A'}</Typography>
        <Typography variant='body2'>Close: {payload[3]?.value || 'N/A'}</Typography>
        <Typography variant='body2'>Turnover: {payload[0].value}</Typography>
      </Paper>
    );
  }

  return null;
};

type BondLiquidityDialogParam = {
  bondReport: BondReport;
  onClose: () => void;
}

export default function BondLiquidityDialog({ bondReport: { details, currentValues }, onClose }: BondLiquidityDialogParam): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [quotes, setQuotes] = useState<BondQuote[]>([]);

  async function fetchData(bondName: string, market: string) {
    console.log(`Fetching quotes for bond: ${bondName}#${market}`);
    try {
      const bondsResponse = await getBondQuotes(bondName, market);
      setErrorMessage(undefined);
      setQuotes(bondsResponse);
      console.log(`Fetched '${bondsResponse.length}' bond quotes`);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        setQuotes([]);
      } else {
        setErrorMessage(Object(error));
        setQuotes([]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData(details.name, details.market);
  }, []);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const chartQuotes = quotes.map(quote => ({
    date: new Date(quote.date),
    bid: quote.bid,
    ask: quote.ask,
    close: quote.close,
    turnover: quote.turnover
  }));

  const now = new Date();
  const xAsisDomain = [sub(now, { days: 30 }).setHours(0, 0, 0, 0), now.setHours(23, 59, 59, 999)];

  const allDataValues = getBids(quotes).concat(getAsks(quotes).concat(getClosePrices(quotes)));
  const dataMin = allDataValues.length > 0 ? min(allDataValues) : 100;
  const dataMax = allDataValues.length > 0 ? max(allDataValues) : 100;
  const minMaxMargin = (dataMax - dataMin) * 0.1;
  const priceDomain = [Math.floor((dataMin - minMaxMargin) * 10) / 10, Math.ceil((dataMax + minMaxMargin) * 10) / 10];

  return (
    <Dialog fullScreen={isMobile} maxWidth='md' fullWidth={!isMobile}
      open={true}>
      <DialogTitle sx={{ backgroundColor: '#eee' }}>
        Data for {details.name}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ width: '100%', maxHeight: '80%', p: 2, backgroundColor: '#eee' }}>
        <Condition render={errorMessage !== undefined}>
          <Alert severity="error">
            <AlertTitle>Cannot fetch data!</AlertTitle>
            <pre>{errorMessage}</pre>
          </Alert>
        </Condition>
        <Condition render={isLoading}>
          <Stack alignItems='center' marginTop={2} marginBottom={2}>
            <CircularProgress />
          </Stack>
        </Condition>
        <Condition render={!isLoading}>
          <>
            <ResponsiveContainer aspect={isMobile ? 0.8 : 1.8}>
              <ComposedChart maxBarSize={20} data={chartQuotes}>
                <XAxis xAxisId='time' type='number' scale='time'
                  padding={{ left: 20, right: 20 }}
                  tickFormatter={dateFormatter} domain={xAsisDomain} dataKey='date'></XAxis>
                <YAxis yAxisId='price' scale='linear' domain={priceDomain}
                  width={40} stroke="#3399ff"
                  tickFormatter={(data: number) => data.toFixed(1)} />
                <YAxis yAxisId='currency' scale='linear'
                  orientation='right' width={40} stroke="#808080" />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                <Legend />
                {isAfter(currentValues.interestFirstDay, xAsisDomain[0]) && isBefore(currentValues.interestFirstDay, xAsisDomain[1]) &&
                  <ReferenceLine xAxisId='time' yAxisId='price' x={currentValues.interestFirstDay} label='Interest first day' stroke="red" />
                }
                {isAfter(currentValues.interestRecordDay, xAsisDomain[0]) && isBefore(currentValues.interestRecordDay, xAsisDomain[1]) &&
                  <ReferenceLine xAxisId='time' yAxisId='price' x={currentValues.interestRecordDay} label='Interest record day' stroke="red" />
                }
                <Bar name='Turnover' xAxisId='time' yAxisId='currency' dataKey='turnover' fill='#909090' />
                <Line name='Bid price' xAxisId='time' yAxisId='price' dataKey='bid' strokeDasharray='5 5' strokeWidth={2} stroke='#82ca9d' />
                <Line name='Ask price' xAxisId='time' yAxisId='price' dataKey='ask' strokeDasharray='5 5' strokeWidth={2} stroke='red' />
                <Line name='Close price' xAxisId='time' yAxisId='price' dataKey='close' strokeWidth={2} stroke="#3399ff" />
              </ComposedChart>
            </ResponsiveContainer>
            {quotes.map(quote => (
              <p>{formatDate(quote.date)} - {quote.turnover} - {quote.bid} - {quote.ask} - {quote.close}</p>
            ))}
          </>
        </Condition>
      </DialogContent>
    </Dialog>
  );
}
