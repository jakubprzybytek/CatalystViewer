import { useMemo } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getUniqueInterestBaseTypes, getUniqueIssuers, getUniqueMarkets, sortStrings } from "@/bonds/statistics";
import { BondReport } from "@/sdk/Bonds";
import { BondReportsFilteringOptions, marketsModifiers, interestBaseTypesModifiers, issuersModifiers, bondTypeModifier, maxNominalValueModifier } from ".";
import { NominalValueFilter, StringFilter, MultiStringFilter } from "./fields";
import IssuersSelector from "./IssuersSelector";

type BondReportsFilterPanelParams = {
  allBondReports: BondReport[];
  allBondTypes: string[];
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
};

export function BondReportsFilterPanel({ allBondReports, allBondTypes, filteringOptions, setFilteringOptions }: BondReportsFilterPanelParams): JSX.Element {
  const allInterestBaseTypes = useMemo(() => sortStrings(getUniqueInterestBaseTypes(allBondReports)), [allBondReports]);
  const allMarkets = useMemo(() => sortStrings(getUniqueMarkets(allBondReports)), [allBondReports]);
  const allIssuers = useMemo(() => getUniqueIssuers(allBondReports), [allBondReports]);

  const setBondType = bondTypeModifier(filteringOptions, setFilteringOptions);
  const setMaxNominal = maxNominalValueModifier(filteringOptions, setFilteringOptions);
  const { addMarket, removeMarket } = marketsModifiers(filteringOptions, setFilteringOptions);
  const { addInterestBaseTyp, removeInterestBasetType } = interestBaseTypesModifiers(filteringOptions, setFilteringOptions);
  const { addIssuer, removeIssuer, removeAllIssuers } = issuersModifiers(filteringOptions, setFilteringOptions);

  return (
    <>
      <Grid container item xs={12} sm={6} md={4} direction='column'>
        <Typography paddingBottom={1}>Select bond type:</Typography>
        <StringFilter label='Bond Type'
          all={allBondTypes} selected={filteringOptions.bondType} setSelected={setBondType} />
      </Grid>
      <Grid container item marginTop={1}>
        <Typography paddingBottom={1}>Apply more filters:</Typography>
        <Grid container item spacing={1}>
          <Grid item xs={12} sm={6} md={4}>
            <NominalValueFilter selectedNominalValue={filteringOptions.maxNominal} setSelectedNominalValue={setMaxNominal} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <MultiStringFilter label='Market'
              all={allMarkets} selected={filteringOptions.markets} add={addMarket} remove={removeMarket} />
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <MultiStringFilter label='Interest base type'
              all={allInterestBaseTypes} selected={filteringOptions.interestBaseTypes} add={addInterestBaseTyp} remove={removeInterestBasetType} />
          </Grid>
        </Grid>
      </Grid>
      <Grid container item marginTop={1} direction='column'>
        <Typography paddingBottom={1}>Select issuers:</Typography>
        <IssuersSelector allIssuers={allIssuers} selectedIssuers={filteringOptions.issuers} addIssuer={addIssuer} removeIssuer={removeIssuer} removeAllIssuers={removeAllIssuers} />
      </Grid>
    </>
  );
}