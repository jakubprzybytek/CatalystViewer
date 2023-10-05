import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { BondReport, BondDetails, BondCurrentValues } from "../../sdk/GetBonds";
import { YieldToMaturityCalculator, YieldToMaturityReport } from "../../bonds/YieldToMaturity";
import { CardSection, CardEntry } from "../../common/Cards";
import Button from "@mui/material/Button";
//import BondYTMReportDialog from "./BondYTMDialog";

function computeYTM(details: BondDetails, currentValues: BondCurrentValues, price: number) {
  const ytmCalculator = new YieldToMaturityCalculator(details, currentValues, 0.0019);
  return {
    ytmNet: ytmCalculator.forPrice(price, 0.19),
    ytmGros: ytmCalculator.forPrice(price, 0)
  }
}

type BondCardYTMSectionParam = {
  title: string;
  bondReport: BondReport;
  price: number;
  secondary?: string;
}

export default function BondCardYTMSection({ title, bondReport, price, secondary }: BondCardYTMSectionParam): JSX.Element {
  const [ytmReport, setYtmReport] = useState<YieldToMaturityReport | undefined>(undefined);

  const [ytmNet, setYtmNet] = useState<YieldToMaturityReport>();
  const [ytmGros, setYtmGros] = useState<YieldToMaturityReport>();

  useEffect(() => {
    const { ytmNet, ytmGros } = computeYTM(bondReport.details, bondReport.currentValues, price);
    setYtmNet(ytmNet);
    setYtmGros(ytmGros);
  }, []);

  if (!ytmNet || !ytmGros) {
    return (
      <CircularProgress size='1.5rem' />
    )
  }

  return (
    <CardSection>
      {/* {ytmReport && <BondYTMReportDialog ytmReport={ytmReport} onClose={() => setYtmReport(undefined)} />} */}
      <CardEntry caption={title} width='50%'>{price} ({secondary})</CardEntry>
      <Button size='small' onClick={() => setYtmReport(ytmNet)}>
        <CardEntry caption='Net YTM' textAlign='center'>{(ytmNet.ytm * 100).toFixed(2)}%</CardEntry>
      </Button>
      <Button size='small' onClick={() => setYtmReport(ytmGros)}>
        <CardEntry caption='Gross YTM' textAlign='end'>{(ytmGros.ytm * 100).toFixed(2)}%</CardEntry>
      </Button>
    </CardSection>
  );
}