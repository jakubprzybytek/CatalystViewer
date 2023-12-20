import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from '@mui/icons-material/Close';
import { Stack, useMediaQuery, useTheme } from "@mui/material";
import { format } from "date-fns";
import { BondDetails, getBondQuotes } from "@/sdk";
import { BondQuote } from "@catalyst-viewer/core/storage/bondStatistics";
import { formatDate } from "@/common/Formats";
import Condition from "@/common/Condition";
import { Legend, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, Line, ComposedChart } from "recharts";

const dateFormatter = (date: number) => {
  return format(new Date(date), "dd-MMM");
};

type BondLiquidityDialogParam = {
  bondDetails: BondDetails;
  onClose: () => void;
}

export default function BondLiquidityDialog({ bondDetails, onClose }: BondLiquidityDialogParam): JSX.Element {
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
    fetchData(bondDetails.name, bondDetails.market);
  }, []);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const chartQuotes = quotes.map(quote => ({
    date: new Date(quote.date),
    bid: quote.bid,
    ask: quote.ask,
    close: quote.close,
    turnover: quote.turnover
  }));

  return (
    <Dialog fullScreen={fullScreen} maxWidth='md'
      open={true}>
      <DialogTitle sx={{ backgroundColor: '#eee' }}>
        Liquidity analysis
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
      <DialogContent sx={{ p: 2, backgroundColor: '#eee' }}>
        <Condition render={isLoading}>
          <Stack alignItems='center' marginTop={2} marginBottom={2}>
            <CircularProgress />
          </Stack>
        </Condition>
        <Condition render={!isLoading}>
          <>
            <ResponsiveContainer width={600} aspect={1.5}>
              <ComposedChart  maxBarSize={20} data={chartQuotes}>
                <XAxis type='number' scale='time' tickFormatter={dateFormatter} domain={[new Date().setDate(10), new Date().getTime()]} dataKey='date'></XAxis>
                <YAxis yAxisId='price' domain={['dataMin - 1', 'dataMax + 1']} />
                <YAxis yAxisId='currency' orientation='right' />
                <Tooltip />
                <Legend />
                <Bar name='Turnover' yAxisId='currency' dataKey='turnover' fill='grey' />
                <Line name='Bid price' yAxisId='price' dataKey='bid' strokeDasharray="5 5" stroke="#82ca9d" />
                <Line name='Ask price' yAxisId='price' dataKey='ask' strokeDasharray="5 5" stroke="red" />
                <Line name='Close price' yAxisId='price' dataKey='close' />
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