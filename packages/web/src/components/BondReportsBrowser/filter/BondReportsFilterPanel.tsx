import { useMemo } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getUniqueInterestBaseTypes, getUniqueMarkets, sortStrings } from "@/bonds/statistics";
import { BondReport } from "@/sdk/GetBonds";
import { BondReportsFilteringOptions } from ".";
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

  const removeElement = (array: string[], elementToRemove: string) => {
    const index = array.indexOf(elementToRemove, 0);
    const newArray = [...array];
    if (index > -1) {
      newArray.splice(index, 1);
    }
    return newArray;
  }

  const setFilteringOption = (newValue: Partial<BondReportsFilteringOptions>) => setFilteringOptions({ ...filteringOptions, ...newValue });

  const addMarket = (newMarket: string) => setFilteringOption({ markets: [...filteringOptions.markets, newMarket] });
  const removeMarket = (marketToRemove: string) => setFilteringOption({ markets: removeElement(filteringOptions.markets, marketToRemove) });
  const addInterestBaseTyp = (newInterestBaseType: string) => setFilteringOption({ interestBaseTypes: [...filteringOptions.interestBaseTypes, newInterestBaseType] });
  const removeInterestBasetType = (interestBaseTypeToRemove: string) => setFilteringOption({ interestBaseTypes: removeElement(filteringOptions.interestBaseTypes, interestBaseTypeToRemove) });

  return (
    <>
      <Grid container item xs={12} sm={6} md={4}>
        <Typography paddingBottom={1}>Select bond type:</Typography>
        <StringFilter label='Bond Type'
          all={allBondTypes} selected={filteringOptions.bondType} setSelected={(newBondType: string) => setFilteringOption({ bondType: newBondType })} />
      </Grid>
      <Grid container spacing={1} marginTop={1}>
        <Grid item xs={12} sm={6} md={4}>
          <Typography paddingBottom={1}>Apply more filters:</Typography>
          <NominalValueFilter selectedNominalValue={filteringOptions.maxNominal} setSelectedNominalValue={(newMaxNominal: number) => setFilteringOption({ maxNominal: newMaxNominal })} />
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
      {/* <IssuersSelector allIssuers={[]} selectedIssuers={[]} addIssuer={} removeIssuer={} removeAllIssuers={} /> */}
      <Typography>Listing (count) bonds</Typography>
    </>
  );
}