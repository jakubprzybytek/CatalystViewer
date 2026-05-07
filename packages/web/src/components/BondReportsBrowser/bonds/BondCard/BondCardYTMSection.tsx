import { useMemo, useState } from "react";
import { BondReport, BondDetails, BondCurrentValues } from "@sdk/Bonds";
import { YieldToMaturityCalculator, YieldToMaturityReport } from "@bonds/YieldToMaturity";
import { CardSectionRow, CardEntry } from "@common/Cards";
import Button from "@mui/material/Button";
import BondYTMReportDialog from "./BondYTMDialog";

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

export default function BondCardYTMSection({ title, bondReport, price, secondary }: BondCardYTMSectionParam): React.JSX.Element {
  const [ytmReport, setYtmReport] = useState<YieldToMaturityReport | undefined>(undefined);

  const { ytmNet, ytmGros } = useMemo(
    () => computeYTM(bondReport.details, bondReport.currentValues, price),
    [bondReport.details, bondReport.currentValues, price]
  );

  return (
    <CardSectionRow>
      {ytmReport && <BondYTMReportDialog ytmReport={ytmReport} onClose={() => setYtmReport(undefined)} />}
      <CardEntry caption={title} width='50%'>{price} ({secondary})</CardEntry>
      <Button size='small' sx={{ textTransform: 'none', p: 0 }} onClick={() => setYtmReport(ytmNet)}>
        <CardEntry caption='Net YTM' textAlign='center'>{(ytmNet.ytm * 100).toFixed(2)}%</CardEntry>
      </Button>
      <Button size='small' sx={{ textTransform: 'none', p: 0 }} onClick={() => setYtmReport(ytmGros)}>
        <CardEntry caption='Gross YTM' textAlign='end'>{(ytmGros.ytm * 100).toFixed(2)}%</CardEntry>
      </Button>
    </CardSectionRow>
  );
}