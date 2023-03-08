import { useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import NominalValueFilter from "./NominalValueFilter";
import MultiStringFilter from "./MultiStringFilter";
import StringFilter from "./StringFilter";
import { useBondsFilters } from "./useBondsFilters";
import { filterBy, getUniqueBondTypes, getUniqueInterestBaseTypes, getUniqueMarkets, isBondType, isInterestBaseType, isOnMarkets, nominalValueLessThan, sortStrings } from "../../bonds/statistics";
import { BondReport } from "../../sdk/GetBonds";

type BondsFilterParams = {
  allBondReports: BondReport[];
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

export default function BondsFilter({ allBondReports, setFilteredBondReports }: BondsFilterParams): JSX.Element {
  const { bondTypeFilterString, setBondTypeFilterString } = useBondsFilters();
  const { maxNominalValueFilterNumber, setMaxNominalValueFilterNumber } = useBondsFilters();
  const { marketsFilterStrings, addMarketFilter, removeMarketFilter } = useBondsFilters();
  const { interestBaseTypeFilterStrings, addInterestBaseTypeFilterString, removeInterestBaseTypeFilterString } = useBondsFilters();
  const { count, setCount } = useBondsFilters();

  // Populate filtering options
  const availableBondTypes = useMemo(() => getUniqueBondTypes(allBondReports), [allBondReports]);
  const allInterestBaseTypes = useMemo(() => sortStrings(getUniqueInterestBaseTypes(allBondReports)), [allBondReports]);
  const allMarkets = useMemo(() => sortStrings(getUniqueMarkets(allBondReports)), [allBondReports]);

  // Perform actual bonds filtering
  useEffect(() => {
    const filterBondReports = filterBy([
      isBondType(bondTypeFilterString),
      nominalValueLessThan(maxNominalValueFilterNumber),
      isOnMarkets(marketsFilterStrings),
      isInterestBaseType(interestBaseTypeFilterStrings)
    ]);

    const filteredBondReports = filterBondReports(allBondReports);
    console.log(`Filtering bonds: ${filteredBondReports.length}, bond type: ${bondTypeFilterString}, max nominal value: ${maxNominalValueFilterNumber}, markets: ${marketsFilterStrings}, base Types: ${interestBaseTypeFilterStrings}`);
    setFilteredBondReports(filteredBondReports);
    setCount(filteredBondReports.length);
  }, [allBondReports, bondTypeFilterString, maxNominalValueFilterNumber, marketsFilterStrings, interestBaseTypeFilterStrings]);

  return (
    <>
      <Grid container item xs={12} sm={6} md={4}>
        <Typography paddingBottom={1}>Select bond type:</Typography>
        <StringFilter label='Bond Type'
          all={availableBondTypes} selected={bondTypeFilterString} setSelected={setBondTypeFilterString} />
      </Grid>
      <Grid container spacing={1} marginTop={1}>
        <Grid item xs={12} sm={6} md={4}>
          <Typography paddingBottom={1}>Apply more filters:</Typography>
          <NominalValueFilter selectedNominalValue={maxNominalValueFilterNumber} setSelectedNominalValue={setMaxNominalValueFilterNumber} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MultiStringFilter label='Market'
            all={allMarkets} selected={marketsFilterStrings} add={addMarketFilter} remove={removeMarketFilter} />
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <MultiStringFilter label='Interest base type'
            all={allInterestBaseTypes} selected={interestBaseTypeFilterStrings} add={addInterestBaseTypeFilterString} remove={removeInterestBaseTypeFilterString} />
        </Grid>
      </Grid>
      <Typography>Listing {count} bonds</Typography>
    </>
  );
}