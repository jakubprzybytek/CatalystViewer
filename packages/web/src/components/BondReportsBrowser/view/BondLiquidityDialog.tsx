import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from '@mui/icons-material/Close';
import { useMediaQuery, useTheme } from "@mui/material";
import { BondDetails, getBondQuotes } from "@/sdk";
import { BondQuote } from "@catalyst-viewer/core/storage/bondStatistics";
import { formatDate } from "@/common/Formats";

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
        {quotes.map(quote => (
          <p>{formatDate(quote.date)} - {quote.turnover}</p>
        ))}
      </DialogContent>
    </Dialog>
  );
}