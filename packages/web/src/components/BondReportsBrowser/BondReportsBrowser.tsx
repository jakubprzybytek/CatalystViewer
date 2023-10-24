import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { BondReport, getBonds } from "@/sdk/GetBonds";
import BondsList from "./BondsList";
import { computeStatisticsForInterestBaseTypes } from "@/bonds/statistics";

type BondReportsBrowserParam = {
  bondReports: BondReport[];
}

export default function BondReportsBrowser(/*{ bondReports }: BondReportsBrowserParam*/): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);
  const [allBondTypes, setAllBondTypes] = useState<string[]>([]);

  const filteredBondReports = allBondReports;

  const filteredBondsStatistics = useMemo(() => computeStatisticsForInterestBaseTypes(filteredBondReports), [filteredBondReports]);

  async function fetchData(bondType: string) {
    console.log(`Fetching reports for bond type: ${bondType}`);
    try {
      const bondsResponse = await getBonds(bondType);
      setErrorMessage(undefined);
      setAllBondReports(bondsResponse.bondReports);
      setAllBondTypes(bondsResponse.facets.type);
      console.log(`Fetched '${bondsResponse.bondReports.length}' bond reports`);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        setAllBondReports([]);
      } else {
        setErrorMessage(Object(error));
        setAllBondReports([]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData('Corporate bonds');
  }, ['Corporate bonds']);
  
  return (
    <Box>
      <BondsList bondReports={filteredBondReports} statistics={filteredBondsStatistics} />
      {errorMessage && <Alert severity="error">
        <AlertTitle>Cannot fetch data!</AlertTitle>
        <pre>{errorMessage}</pre>
      </Alert>}
    </Box>
  );
}