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
import { BondReport, getBondReports } from "@/sdk/Bonds";
import { computeStatisticsForInterestBaseTypes } from "@/bonds/statistics";

export enum BondReportsView {
  Issuers,
  Bonds
}

export type BondReportsBrowserSettings = {
  name: string;
  view: BondReportsView;
  filteringOptions: BondReportsFilteringOptions;
  sortOrder: BondReportsSortOrder;
}

function useSettings<FieldType>(
  settings: BondReportsBrowserSettings,
  setSettings: (newSettings: BondReportsBrowserSettings) => void,
  fieldName: keyof BondReportsBrowserSettings,
  fieldDefaultValue: FieldType
): [FieldType, (a: FieldType) => void] {
  const fieldValue: FieldType = settings[fieldName] as FieldType || fieldDefaultValue;
//  const fieldValue: FieldType = {...fieldDefaultValue, ...(settings[fieldName] as FieldType)};
  const fieldValueSetter = (newValue: FieldType) => setSettings({ ...settings, [fieldName]: newValue });
  return [fieldValue, fieldValueSetter];
}

export const DEFAULT_VIEW_SETTING = BondReportsView.Issuers;
export const DEFAULT_FILTERIN_OPTIONS_SETTING: BondReportsFilteringOptions = {
  bondType: 'Corporate bonds',
  maxNominal: 10000,
  currencies: ['PLN', 'EUR'],
  markets: ['GPW ASO', 'GPW RR'],
  interestBaseTypes: ['WIBOR 3M', 'WIBOR 6M'],
  issuers: []
};
export const DEFAULT_SORT_ORDER_SETTING = BondReportsSortOrder.Name;

type BondReportsBrowserParams = {
  settings: BondReportsBrowserSettings;
  setSettings: (newSettings: BondReportsBrowserSettings) => void;
}

export default function BondReportsBrowser({ settings, setSettings }: BondReportsBrowserParams): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [allBondReports, setAllBondReports] = useState<BondReport[]>([]);
  const [allBondTypes, setAllBondTypes] = useState<string[]>([]);

  // view
  const [view, setView] = useSettings<BondReportsView>(settings, setSettings, 'view', DEFAULT_VIEW_SETTING);

  // filtering
  const [filteringOptions, setFilteringOptions] = useSettings<BondReportsFilteringOptions>(settings, setSettings, 'filteringOptions', DEFAULT_FILTERIN_OPTIONS_SETTING);
  const [filteringDrawerOpen, setFilteringDrawerOpen] = useState(false);

  // sorting
  const [sortOrder, setSortOrder] = useSettings<BondReportsSortOrder>(settings, setSettings, 'sortOrder', DEFAULT_SORT_ORDER_SETTING);
  const [sortMenuTriggerEl, setSortMenuTriggerEl] = useState<null | HTMLElement>(null);

  // stats
  const [statsShown, setStatsShown] = useState(false);

  function selectBondReportsSortOrder(sortOrder: BondReportsSortOrder) {
    setSortOrder(sortOrder);
    setSortMenuTriggerEl(null);
  }

  async function fetchData(bondType: string) {
    console.log(`Fetching reports for bond type: ${bondType}`);
    try {
      const bondsResponse = await getBondReports(bondType);
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

  // Perform bonds filtering
  const filteredBondReports = useMemo(() => {
    //console.log(`Applying filters: ${JSON.stringify(filteringOptions)} to ${allBondReports.length} bond reports`);

    const filterBondReports = filterUsing(filteringOptions);
    const filteredBondReports = filterBondReports(allBondReports);

    //console.log(`Filtering result: ${filteredBondReports.length} bond reports`);

    return filteredBondReports;
  }, [allBondReports, filteringOptions.maxNominal, filteringOptions.currencies, filteringOptions.markets, filteringOptions.interestBaseTypes, filteringOptions.issuers]);

  const filteredAndSortedBondsReports = useMemo(() =>
    getBondReportsSortingFunction(sortOrder)(filteredBondReports), [sortOrder, filteredBondReports]);

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
          <BondReportsSortMenu anchorEl={sortMenuTriggerEl} selectedBondReportsSortOrder={sortOrder} setBondReportsSortOrder={selectBondReportsSortOrder} />
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
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
            onChange={(event: React.MouseEvent<HTMLElement>, newView: BondReportsView) => setView(newView !== null ? newView : view)}>
            <ToggleButton value={BondReportsView.Issuers}>Issuers</ToggleButton>
            <ToggleButton value={BondReportsView.Bonds}>Bonds</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButton color="secondary" size="small" value="check" selected={statsShown}
            onChange={() => setStatsShown(!statsShown)}>
            Show stats
          </ToggleButton>
        </Stack>
        <Collapse in={statsShown}>
          <BondsListStats bondReports={filteredBondReports} statistics={bondReportsStatistics} />
        </Collapse>
        <Condition render={view == BondReportsView.Bonds}>
          <BondsList bondReports={filteredAndSortedBondsReports} statistics={bondReportsStatistics} />
        </Condition>
        <Condition render={view == BondReportsView.Issuers}>
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