import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import BondsList from "./view/BondsList";
import IconButton from "@mui/material/IconButton";
import FilterAlt from "@mui/icons-material/FilterAlt";
import Refresh from "@mui/icons-material/Refresh";
import Sort from "@mui/icons-material/Sort";
import MainNavigation from "../MainNavigation";
import BondReportsFilterDrawer, { BondReportsFilteringOptions, filterUsing } from "./filter";
import BondReportsSortMenu, { BondReportsSortOrder, getBondReportsSortingFunction } from "./sort";
import { BondReport, getBonds } from "@/sdk/GetBonds";
import { computeStatisticsForInterestBaseTypes } from "@/bonds/statistics";

const DEFAULT_FILTERING_OPTIONS: BondReportsFilteringOptions = {
  bondType: 'Corporate bonds',
  maxNominal: 10000,
  markets: ['GPW ASO', 'GPW RR'],
  interestBaseTypes: ['WIBOR 3M', 'WIBOR 6M']
}

export default function BondReportsBrowser(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // filtering
  const [filteringDrawerOpen, setFilteringDrawerOpen] = useState(false);

  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);
  const [allBondTypes, setAllBondTypes] = useState<string[]>([]);

  const [filteringOptions, setFilteringOptions] = useState<BondReportsFilteringOptions>(DEFAULT_FILTERING_OPTIONS);
  const [filteredBondReports, setFilteredBondReports] = useState<BondReport[]>([]);

  const filteredBondsStatistics = useMemo(() => computeStatisticsForInterestBaseTypes(filteredBondReports), [filteredBondReports]);

  // sorting
  const [sortMenuTriggerEl, setSortMenuTriggerEl] = useState<null | HTMLElement>(null);
  const [selectedBondReportsSortOrder, setSelectedBondReportsSortOrder] = useState<BondReportsSortOrder>(BondReportsSortOrder.Name);

  function selectBondReportsSortOrder(sortOrder: BondReportsSortOrder) {
    setSelectedBondReportsSortOrder(sortOrder);
    setSortMenuTriggerEl(null);
  }

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

  const filteredAndSortedBondsStatistics = useMemo(() =>
    getBondReportsSortingFunction(selectedBondReportsSortOrder)(filteredBondReports), [selectedBondReportsSortOrder, filteredBondReports]);

  return (
    <>
      <MainNavigation>
        <>
          <IconButton color='inherit' disabled={isLoading}
            onClick={() => { setIsLoading(true); fetchData(filteringOptions.bondType); }}>
            <Refresh />
          </IconButton>
          <IconButton color='inherit'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => setSortMenuTriggerEl(event.currentTarget)}>
            <Sort />
          </IconButton>
          <IconButton color='inherit'
            onClick={() => setFilteringDrawerOpen(true)}>
            <FilterAlt />
          </IconButton>
        </>
      </MainNavigation>
      <BondReportsSortMenu anchorEl={sortMenuTriggerEl} selectedBondReportsSortOrder={selectedBondReportsSortOrder} setBondReportsSortOrder={selectBondReportsSortOrder} />
      <BondReportsFilterDrawer open={filteringDrawerOpen} onClose={() => setFilteringDrawerOpen(false)} allBondReports={allBondReports} allBondTypes={allBondTypes} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} />
      <Box sx={{ height: 48 }} />
      <Box padding={1}>
        <BondsList bondReports={filteredAndSortedBondsStatistics} statistics={filteredBondsStatistics} />
        {errorMessage && <Alert severity="error">
          <AlertTitle>Cannot fetch data!</AlertTitle>
          <pre>{errorMessage}</pre>
        </Alert>}
      </Box>
    </>
  );
}