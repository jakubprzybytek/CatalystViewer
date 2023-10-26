import { useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { NominalValueFilter, StringFilter, MultiStringFilter } from "./fields";
import { filterBy, getUniqueInterestBaseTypes, getUniqueMarkets, isBondType, isInterestBaseType, isOnMarkets, nominalValueLessThan, sortStrings } from "@/bonds/statistics";
import { BondReport } from "@/sdk/GetBonds";
import { BondReportsFilteringOptions } from ".";

type BondReportsFilterParams = {
  allBondReports: BondReport[];
  allBondTypes: string[];
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
  // setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

export default function BondReportsFilter({ allBondReports, allBondTypes, filteringOptions, setFilteringOptions, /*setFilteredBondReports*/ }: BondReportsFilterParams): JSX.Element {
  //const { bondTypeFilterString, setBondTypeFilterString } = useBondsFilters();

  // const { maxNominalValueFilterNumber, setMaxNominalValueFilterNumber } = useBondsFilters();
  // const { marketsFilterStrings, addMarketFilter, removeMarketFilter } = useBondsFilters();
  // const { interestBaseTypeFilterStrings, addInterestBaseTypeFilterString, removeInterestBaseTypeFilterString } = useBondsFilters();
  // const { count, setCount } = useBondsFilters();

  // Populate filtering options
  //const availableBondTypes = useMemo(() => getUniqueBondTypes(allBondReports), [allBondReports]);
  const allInterestBaseTypes = useMemo(() => sortStrings(getUniqueInterestBaseTypes(allBondReports)), [allBondReports]);
  const allMarkets = useMemo(() => sortStrings(getUniqueMarkets(allBondReports)), [allBondReports]);

  // Perform actual bonds filtering
  // useEffect(() => {
  //   const filterBondReports = filterBy([
  //     isBondType(bondTypeFilterString),
  //     nominalValueLessThan(maxNominalValueFilterNumber),
  //     isOnMarkets(marketsFilterStrings),
  //     isInterestBaseType(interestBaseTypeFilterStrings)
  //   ]);

  //   const filteredBondReports = filterBondReports(allBondReports);
  //   console.log(`Filtering bonds: ${filteredBondReports.length}, bond type: ${bondTypeFilterString}, max nominal value: ${maxNominalValueFilterNumber}, markets: ${marketsFilterStrings}, base Types: ${interestBaseTypeFilterStrings}`);
  //   setFilteredBondReports(filteredBondReports);
  //   setCount(filteredBondReports.length);
  // }, [allBondReports, bondTypeFilterString, maxNominalValueFilterNumber, marketsFilterStrings, interestBaseTypeFilterStrings]);


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
      <Typography>Listing (count) bonds</Typography>
    </>
  );
}