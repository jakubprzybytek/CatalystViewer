import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { BondReport, BondDetails, BondCurrentValues } from "../../sdk/GetBonds";
import { YieldToMaturityCalculator } from "../../bonds/YieldToMaturity";
import { CardSection, CardEntry } from "../Cards";
import { Button, Popover } from "@mui/material";
import BondYTMReportDialog from "./BondYTMDialog";

function computeYTM(details: BondDetails, currentValues: BondCurrentValues, price: number) {
  const ytmCalculator = new YieldToMaturityCalculator(details, currentValues, 0.0019);
  return {
    ytmNet: ytmCalculator.forPrice(price, 0.19).ytm,
    ytmGros: ytmCalculator.forPrice(price, 0).ytm
  }
}

type BondCardYTMSectionParam = {
  title: string;
  bondReport: BondReport;
  price: number;
  secondary?: string;
}

export default function BondCardYTMSection({ title, bondReport, price, secondary }: BondCardYTMSectionParam): JSX.Element {
  const [open, setOpen] = useState(false);

  const [ytmNet, setYtmNet] = useState<number>();
  const [ytmGros, setYtmGros] = useState<number>();

  useEffect(() => {
    const { ytmNet: computedYtmNet, ytmGros: computedYtmGros } = computeYTM(bondReport.details, bondReport.currentValues, price);
    setYtmNet(computedYtmNet);
    setYtmGros(computedYtmGros);
  }, []);

  if (!ytmNet || !ytmGros) {
    return (
      <CircularProgress size='1.5rem' />
    )
  }

  return (
    <CardSection>
      {open && <BondYTMReportDialog onClose={() => setOpen(false)} />}
      <CardEntry caption={title} width='50%'>{price} ({secondary})</CardEntry>
      <Button size='small' onClick={() => setOpen(true)}>
        <CardEntry caption='Net YTM' textAlign='center'>{(ytmNet * 100).toFixed(2)}%</CardEntry>
      </Button>
      <Button size='small' onClick={() => setOpen(true)}>
        <CardEntry caption='Gross YTM' textAlign='end'>{(ytmGros * 100).toFixed(2)}%</CardEntry>
      </Button>
    </CardSection>
  );
}