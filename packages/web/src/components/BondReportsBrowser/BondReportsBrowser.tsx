import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import BondsList from "./view/BondsList";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import FilterAlt from "@mui/icons-material/FilterAlt";
import Refresh from "@mui/icons-material/Refresh";
import Sort from "@mui/icons-material/Sort";
import MainNavigation from "../MainNavigation";
import BondReportsFilterDrawer, { BondReportsFilteringOptions, filterUsing } from "./filter";
import BondReportsSortMenu, { BondReportsSortOrder, getBondReportsSortingFunction } from "./sort";
import { BondReport, getBonds } from "@/sdk/GetBonds";
import { computeStatisticsForInterestBaseTypes } from "@/bonds/statistics";
import BondsListStats from "./view/BondsListStats";
import IssuersViewer from "./issuers/IssuersViewer";

type ConditionParams = {
  render: boolean;
  children: React.ReactElement;
}

function Condition({ render, children }: ConditionParams): JSX.Element {
  if (render) {
    return (<>{children} </>);
  } else {
    return (<></>);
  }
}

enum View {
  Issuers,
  Bonds
}

const DEFAULT_FILTERING_OPTIONS: BondReportsFilteringOptions = {
  bondType: 'Corporate bonds',
  maxNominal: 10000,
  markets: ['GPW ASO', 'GPW RR'],
  interestBaseTypes: ['WIBOR 3M', 'WIBOR 6M'],
  issuers: []
}

export default function BondReportsBrowser(): JSX.Element {
  const [view, setView] = useState(View.Issuers);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);
  const [allBondTypes, setAllBondTypes] = useState<string[]>([]);

  // stats
  const [statsShown, setStatsShown] = useState(false);

  // filtering
  const [filteringDrawerOpen, setFilteringDrawerOpen] = useState(false);
  const [filteringOptions, setFilteringOptions] = useState<BondReportsFilteringOptions>(DEFAULT_FILTERING_OPTIONS);

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

  // first, filter without issuers - it will be used to display all issuers
  const filteredBondReportsWithoutIssuers = useMemo(() =>
    filterUsing({ ...filteringOptions, issuers: [] })(allBondReports)
    , [allBondReports, filteringOptions.maxNominal, filteringOptions.markets, filteringOptions.interestBaseTypes]);

  const filteredBondReportsWithoutIssuersStatistics = useMemo(() =>
    computeStatisticsForInterestBaseTypes(filteredBondReportsWithoutIssuers)
    , [filteredBondReportsWithoutIssuers]);

  // Perform bonds filtering
  const filteredBondReports = useMemo(() => {
    console.log(`Applying filters: ${JSON.stringify(filteringOptions)} to ${allBondReports.length} bond reports`);

    const filterBondReports = filterUsing(filteringOptions);
    const filteredBondReports = filterBondReports(allBondReports);

    console.log(`Filtering result: ${filteredBondReports.length} bond reports`);

    return filteredBondReports;
  }, [allBondReports, filteringOptions.maxNominal, filteringOptions.markets, filteringOptions.interestBaseTypes, filteringOptions.issuers]);
  const filteredBondsStatistics = useMemo(() => computeStatisticsForInterestBaseTypes(filteredBondReports), [filteredBondReports]);

  const filteredAndSortedBondsStatistics = useMemo(() =>
    getBondReportsSortingFunction(selectedBondReportsSortOrder)(filteredBondReports), [selectedBondReportsSortOrder, filteredBondReports]);

  const title = `${filteredBondReports.length} ${filteringOptions.bondType}`;

  return (
    <>
      <MainNavigation title={title}>
        <>
          <IconButton color='inherit' disabled={isLoading}
            onClick={() => { setIsLoading(true); fetchData(filteringOptions.bondType); }}>
            <Refresh />
          </IconButton>
          <IconButton color='inherit' disabled={isLoading}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => setSortMenuTriggerEl(event.currentTarget)}>
            <Sort />
          </IconButton>
          <IconButton color='inherit' disabled={isLoading}
            onClick={() => setFilteringDrawerOpen(true)}>
            <FilterAlt />
          </IconButton>
        </>
      </MainNavigation>
      <BondReportsSortMenu anchorEl={sortMenuTriggerEl} selectedBondReportsSortOrder={selectedBondReportsSortOrder} setBondReportsSortOrder={selectBondReportsSortOrder} />
      <BondReportsFilterDrawer open={filteringDrawerOpen} onClose={() => setFilteringDrawerOpen(false)} allBondReports={allBondReports} allBondTypes={allBondTypes} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} filteredBondReports={filteredBondReports} />
      <Box sx={{ height: 48 }} />
      <Condition render={isLoading}>
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <CircularProgress size='6rem' sx={{ marginTop: 60 }} />
        </Box>
      </Condition>
      <Box padding={1}>
        <Typography component='p' sx={{ textAlign: 'end', cursor: 'pointer' }}
          onClick={() => setView(view === View.Bonds ? View.Issuers : View.Bonds)}>List {view === View.Bonds ? 'issuers' : 'bonds'}</Typography>
        <Typography component='p' sx={{ textAlign: 'end', cursor: 'pointer' }}
          onClick={() => setStatsShown(!statsShown)}>{statsShown ? 'Hide' : 'Show'} stats</Typography>
        <Collapse in={statsShown} sx={{ marginBottom: 1 }}>
          <BondsListStats bondReports={filteredBondReports} statistics={filteredBondsStatistics} />
        </Collapse>
        <Condition render={view == View.Bonds}>
          <BondsList disabled={isLoading} bondReports={filteredAndSortedBondsStatistics} statistics={filteredBondsStatistics} />
        </Condition>
        <Condition render={view == View.Issuers}>
          <IssuersViewer disabled={isLoading} bondReports={filteredBondReportsWithoutIssuers} statistics={filteredBondReportsWithoutIssuersStatistics} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} />
        </Condition>
        <Condition render={errorMessage !== undefined}>
          <Alert severity="error">
            <AlertTitle>Cannot fetch data!</AlertTitle>
            <pre>{errorMessage}</pre>
          </Alert>
        </Condition>
      </Box >
    </>
  );
}