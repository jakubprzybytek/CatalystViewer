import { useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import BondTypeFilter from "./BondTypeFilter";
import NominalValueFilter from "./NominalValueFilter";
import MarketFilter from "./MarketFilter";
import { useBondsFilters } from "./useBondsFilters";
import { filterBy, getUniqueBondTypes, getUniqueMarkets, isBondType, isOnMarkets, nominalValueLessThan, sortStrings } from "../../bonds/statistics";
import { BondReport } from "../../sdk/GetBonds";

type BondsFilterParams = {
  allBondReports: BondReport[];
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

export default function BondsFilter({ allBondReports, setFilteredBondReports }: BondsFilterParams): JSX.Element {
  const { bondTypeFilterString, setBondTypeFilterString } = useBondsFilters();
  const { maxNominalValueFilterNumber, setMaxNominalValueFilterNumber } = useBondsFilters();
  const { marketsFilterStrings, addMarketFilter, removeMarketFilter } = useBondsFilters();
  const { setCount } = useBondsFilters();


  // Populate filtering options
  const availableBondTypes = useMemo(() => getUniqueBondTypes(allBondReports), [allBondReports]);
  const allMarkets = useMemo(() => sortStrings(getUniqueMarkets(allBondReports)), [allBondReports]);

  // Perform actual bonds filtering
  useEffect(() => {
    const filterBondReports = filterBy([isBondType(bondTypeFilterString), nominalValueLessThan(maxNominalValueFilterNumber), isOnMarkets(marketsFilterStrings)]);

    const filteredBondReports = filterBondReports(allBondReports);
    console.log(`Filtering bonds: ${filteredBondReports.length}, bond type: ${bondTypeFilterString}, max nominal value: ${maxNominalValueFilterNumber}, markets: ${marketsFilterStrings}`);
    setFilteredBondReports(filteredBondReports);
    setCount(filteredBondReports.length);
  }, [allBondReports, bondTypeFilterString, maxNominalValueFilterNumber, marketsFilterStrings]);

  return (
    <>
      <Grid container item xs={12} sm={6} md={4}>
        <Typography paddingBottom={1}>Select bond type:</Typography>
        <BondTypeFilter bondTypes={availableBondTypes} selectedBondType={bondTypeFilterString} setSelectedBondType={setBondTypeFilterString} />
      </Grid>
      <Grid container spacing={1} marginTop={1}>
        <Grid item xs={12} sm={6} md={4}>
          <Typography paddingBottom={1}>Apply more filters:</Typography>
          <NominalValueFilter selectedNominalValue={maxNominalValueFilterNumber} setSelectedNominalValue={setMaxNominalValueFilterNumber} />
        </Grid>
        <Grid item xs={12} sm={6} md={8}>
          <MarketFilter allMarkets={allMarkets} selectedMarkets={marketsFilterStrings} addMarket={addMarketFilter} removeMarket={removeMarketFilter} />
        </Grid>
      </Grid>
    </>
  );
}