import { useMemo } from "react";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { getUniqueInterestBaseTypes, getUniqueIssuers, getUniqueMarkets, getUniqueCurrencies, sortStrings } from "@/bonds/statistics";
import { BondReport } from "@/sdk/Bonds";
import { BondReportsFilteringOptions, marketsModifiers, interestBaseTypesModifiers, issuersModifiers, bondTypeModifier, maxNominalValueModifier, currenciesModifiers, treasuryBondTypesModifiers, industriesModifiers, POLISH_TREASURY_ISSUER, CORPORATE_BONDS } from ".";
import { NominalValueFilter, StringFilter, MultiStringFilter, ChipFilter, type ChipOption } from "./fields";
import { FINANCE, NONE, isInIndustries, type IssuerIndustry } from "@/bonds/fundamentals/industries";
import IssuersSelector from "./IssuersSelector";

const TREASURY_BOND_TYPES = [
  { label: '5 year const (PS)', value: 'PS' },
  { label: '10 year const (DS)', value: 'DS' },
  { label: '30 year const (WS)', value: 'WS' },
  { label: '6-11 year var (WZ)', value: 'WZ' },
  { label: '6-12 year anti infl (IZ)', value: 'IZ' },
  { label: '2 year zero coupon (OK)', value: 'OK' },
  { label: 'const (EUR)', value: 'EUR' }
];

type BondReportsFilterPanelParams = {
  allBondReports: BondReport[];
  allBondTypes: string[];
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
  industriesAvailable: { industries: ChipOption[]; financeGroups: ChipOption[] };
  industryOf: (issuerName: string) => IssuerIndustry;
};

export function BondReportsFilterPanel({ allBondReports, allBondTypes, filteringOptions, setFilteringOptions, industriesAvailable, industryOf }: BondReportsFilterPanelParams): React.JSX.Element {
  const allMarkets = useMemo(() => sortStrings(getUniqueMarkets(allBondReports)), [allBondReports]);
  const allInterestBaseTypes = useMemo(() => sortStrings(getUniqueInterestBaseTypes(allBondReports)), [allBondReports]);
  const allCurrencies = useMemo(() => getUniqueCurrencies(allBondReports), [allBondReports]);
  const industries = filteringOptions.industries ?? NONE;
  const financeGroups = filteringOptions.financeGroups ?? NONE;
  const isCorporate = filteringOptions.bondType === CORPORATE_BONDS;
  // The issuers to pick from: those of the chosen industries
  const allIssuers = useMemo(() => getUniqueIssuers(isCorporate ? allBondReports.filter(isInIndustries(industries, financeGroups, industryOf)) : allBondReports),
    [allBondReports, isCorporate, industries, financeGroups, industryOf]);

  const setBondType = bondTypeModifier(filteringOptions, setFilteringOptions);
  const setMaxNominal = maxNominalValueModifier(filteringOptions, setFilteringOptions);
  const { addMarket, removeMarket } = marketsModifiers(filteringOptions, setFilteringOptions);
  const { addInterestBaseTyp, removeInterestBasetType } = interestBaseTypesModifiers(filteringOptions, setFilteringOptions);
  const { addCurrency, removeCurrency } = currenciesModifiers(filteringOptions, setFilteringOptions);
  const { addIssuer, removeIssuer, removeAllIssuers } = issuersModifiers(filteringOptions, setFilteringOptions);
  const { addtreasuryBondType, removetreasuryBondType } = treasuryBondTypesModifiers(filteringOptions, setFilteringOptions);
  const { toggleIndustry, toggleFinanceGroup } = industriesModifiers(filteringOptions, setFilteringOptions);

  const isTreasuryBondsSelected = filteringOptions.issuers.includes(POLISH_TREASURY_ISSUER);

  return (
    <Stack>
      <Box sx={{ marginTop: 1, padding: 1 }}>
        <StringFilter label='Bond Type'
          all={allBondTypes} selected={filteringOptions.bondType} setSelected={setBondType} />
      </Box>
      <Divider>Properties</Divider>
      <Grid container spacing={2} sx={{
        padding: 1
      }}>
        <Grid size={12}>
          <NominalValueFilter selectedNominalValue={filteringOptions.maxNominal} setSelectedNominalValue={setMaxNominal} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MultiStringFilter label='Market'
            all={allMarkets} selected={filteringOptions.markets} add={addMarket} remove={removeMarket} />
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
          <MultiStringFilter label='Interest base type'
            all={allInterestBaseTypes} selected={filteringOptions.interestBaseTypes} add={addInterestBaseTyp} remove={removeInterestBasetType} />
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
          <MultiStringFilter label='Currency'
            all={allCurrencies} selected={filteringOptions.currencies} add={addCurrency} remove={removeCurrency} />
        </Grid>
      </Grid>
      <Divider>Issuers</Divider>
      {isCorporate && industriesAvailable.industries.length > 0 && (
        <Box sx={{ padding: 1, paddingTop: 0 }}>
          <ChipFilter label='Industry' all={industriesAvailable.industries} selected={industries} toggle={toggleIndustry} />
        </Box>
      )}
      <Box sx={{ padding: 1, paddingTop: 0 }}>
        <IssuersSelector allIssuers={allIssuers} selectedIssuers={filteringOptions.issuers} addIssuer={addIssuer} removeIssuer={removeIssuer} removeAllIssuers={removeAllIssuers} />
      </Box>
      {isCorporate && industries.includes(FINANCE) && industriesAvailable.financeGroups.length > 0 && <>
        <Divider>Finance</Divider>
        <Box sx={{ padding: 1, paddingTop: 0 }}>
          <ChipFilter label='Kind of financial company' all={industriesAvailable.financeGroups} selected={financeGroups} toggle={toggleFinanceGroup} />
        </Box>
      </>}
      {isTreasuryBondsSelected && <>
        <Divider>Skarb Państwa</Divider>
        <Box sx={{ padding: 1, paddingTop: 0 }}>
          <MultiStringFilter label='Treasury Bond Type'
            all={TREASURY_BOND_TYPES} selected={filteringOptions.treasuryBondTypes} add={addtreasuryBondType} remove={removetreasuryBondType} />
        </Box>
      </>}
    </Stack>
  );
}