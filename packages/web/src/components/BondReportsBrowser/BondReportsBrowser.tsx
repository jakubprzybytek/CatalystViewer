import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { BondReport, getBonds } from "@/sdk/GetBonds";
import BondsList from "./view/BondsList";
import { computeStatisticsForInterestBaseTypes } from "@/bonds/statistics";
import { BondReportsFilteringOptions, filterUsing } from "./filter";
import BondReportsFilter from "./filter/BondReportsFilter";

const DEFAULT_FILTERING_OPTIONS: BondReportsFilteringOptions = {
  bondType: 'Corporate bonds',
  maxNominal: 10000,
  markets: ['GPW ASO', 'GPW RR'],
  interestBaseTypes: ['WIBOR 3M', 'WIBOR 6M']
}

type BondReportsBrowserParam = {
  bondReports: BondReport[];
}

export default function BondReportsBrowser(/*{ bondReports }: BondReportsBrowserParam*/): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);
  const [allBondTypes, setAllBondTypes] = useState<string[]>([]);

  const [filteringOptions, setFilteringOptions] = useState<BondReportsFilteringOptions>(DEFAULT_FILTERING_OPTIONS);

  const [filteredBondReports, setFilteredBondReports] = useState<BondReport[]>([]);

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
    fetchData(filteringOptions.bondType);
  }, [filteringOptions.bondType]);

  // Perform bonds filtering
  useEffect(() => {
    console.log(`Applying filters: ${JSON.stringify(filteringOptions)} to ${allBondReports.length} bond reports`);

    const filterBondReports = filterUsing(filteringOptions);
    const filteredBondReports = filterBondReports(allBondReports);

    console.log(`Filtering result: ${filteredBondReports.length} bond reports`);
    setFilteredBondReports(filteredBondReports);
  }, [allBondReports, filteringOptions.maxNominal, filteringOptions.markets, filteringOptions.interestBaseTypes]);

  return (
    <Box>
      <BondReportsFilter allBondReports={allBondReports} allBondTypes={allBondTypes} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} />
      <BondsList bondReports={filteredBondReports} statistics={filteredBondsStatistics} />
      {errorMessage && <Alert severity="error">
        <AlertTitle>Cannot fetch data!</AlertTitle>
        <pre>{errorMessage}</pre>
      </Alert>}
    </Box>
  );
}