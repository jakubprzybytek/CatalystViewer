import { useEffect, useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import BondsList from "./view/BondsList";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import FilterAlt from "@mui/icons-material/FilterAlt";
import Refresh from "@mui/icons-material/Refresh";
import Sort from "@mui/icons-material/Sort";
import Condition from "@/common/Condition";
import MainNavigation from "../MainNavigation";
import BondsListStats from "./view/BondsListStats";
import IssuersViewer from "./issuers/IssuersViewer";
import BondReportsFilterDrawer, { BondReportsFilteringOptions, filterUsing } from "./filter";
import BondReportsSortMenu, { BondReportsSortOrder, getBondReportsSortingFunction } from "./sort";
import { BondReport, getBonds } from "@/sdk/Bonds";
import { computeStatisticsForInterestBaseTypes } from "@/bonds/statistics";

export type BondReportsBrowserSettings = {
  name: string;
  filteringOptions: BondReportsFilteringOptions;
}

enum View {
  Issuers,
  Bonds
}

type BondReportsBrowserParams = {
  settings: BondReportsBrowserSettings;
  setSettings: (newSettings: BondReportsBrowserSettings) => void;
}

export default function BondReportsBrowser({ settings, setSettings }: BondReportsBrowserParams): JSX.Element {
  const [view, setView] = useState(View.Issuers);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);
  const [allBondTypes, setAllBondTypes] = useState<string[]>([]);

  // stats
  const [statsShown, setStatsShown] = useState(false);

  // filtering
  const [filteringDrawerOpen, setFilteringDrawerOpen] = useState(false);
  //const [filteringOptions, setFilteringOptions] = useState<BondReportsFilteringOptions>(DEFAULT_FILTERING_OPTIONS);

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

  const filteringOptions = settings.filteringOptions;
  const setFilteringOptions = (filteringOptions: BondReportsFilteringOptions) => setSettings({ ...settings, filteringOptions });

  useEffect(() => {
    setIsLoading(true);
    fetchData(filteringOptions.bondType);
  }, [filteringOptions.bondType]);

  // first, filter without issuers - it will be used to display all issuers
  const filteredBondReportsWithoutIssuers = useMemo(() =>
    filterUsing({ ...filteringOptions, issuers: [] })(allBondReports)
    , [allBondReports, filteringOptions.maxNominal, filteringOptions.markets, filteringOptions.interestBaseTypes]);

  // Perform bonds filtering
  const filteredBondReports = useMemo(() => {
    //console.log(`Applying filters: ${JSON.stringify(filteringOptions)} to ${allBondReports.length} bond reports`);

    const filterBondReports = filterUsing(filteringOptions);
    const filteredBondReports = filterBondReports(allBondReports);

    //console.log(`Filtering result: ${filteredBondReports.length} bond reports`);

    return filteredBondReports;
  }, [allBondReports, filteringOptions.maxNominal, filteringOptions.markets, filteringOptions.interestBaseTypes, filteringOptions.issuers]);

  const filteredAndSortedBondsReports = useMemo(() =>
    getBondReportsSortingFunction(selectedBondReportsSortOrder)(filteredBondReports), [selectedBondReportsSortOrder, filteredBondReports]);

  const bondReportsStatistics = useMemo(() => computeStatisticsForInterestBaseTypes(allBondReports), [allBondReports]);

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
            onClick={() => setFilteringDrawerOpen(true)}>
            <FilterAlt />
          </IconButton>
          <IconButton color='inherit' disabled={isLoading}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => setSortMenuTriggerEl(event.currentTarget)}>
            <Sort />
          </IconButton>
          <BondReportsSortMenu anchorEl={sortMenuTriggerEl} selectedBondReportsSortOrder={selectedBondReportsSortOrder} setBondReportsSortOrder={selectBondReportsSortOrder} />
          <BondReportsFilterDrawer open={filteringDrawerOpen} onClose={() => setFilteringDrawerOpen(false)} allBondReports={allBondReports} allBondTypes={allBondTypes} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} filteredBondReports={filteredBondReports} />
        </>
      </MainNavigation>
      <Box sx={{ height: 48 }} />
      <Condition render={isLoading}>
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <CircularProgress size='6rem' sx={{ mt: 10 }} />
        </Box>
      </Condition>
      <Box sx={{
        '& > div.MuiStack-root': { mt: 1, pl: 1, pr: 1 },
        '& div.MuiCollapse-wrapper, & > div.MuiBox-root': { mt: 1, pl: { sm: 1 }, pr: { sm: 1 } }
      }}>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup color="secondary" size="small" exclusive
            value={view}
            onChange={(event: React.MouseEvent<HTMLElement>, newView: View) => setView(newView !== null ? newView : view)}>
            <ToggleButton value={View.Issuers}>Issuers</ToggleButton>
            <ToggleButton value={View.Bonds}>Bonds</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButton color="secondary" size="small" value="check" selected={statsShown}
            onChange={() => setStatsShown(!statsShown)}>
            Show stats
          </ToggleButton>
        </Stack>
        <Collapse in={statsShown}>
          <BondsListStats bondReports={filteredBondReports} statistics={bondReportsStatistics} />
        </Collapse>
        <Condition render={view == View.Bonds}>
          <BondsList bondReports={filteredAndSortedBondsReports} statistics={bondReportsStatistics} />
        </Condition>
        <Condition render={view == View.Issuers}>
          <IssuersViewer bondReports={filteredBondReportsWithoutIssuers} statistics={bondReportsStatistics} filteringOptions={filteringOptions} setFilteringOptions={setFilteringOptions} />
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