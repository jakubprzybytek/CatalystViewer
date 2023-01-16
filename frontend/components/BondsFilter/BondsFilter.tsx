import { useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import BondTypeFilter from "./BondTypeFilter";
import NominalValueFilter from "./NominalValueFilter";
import MarketFilter from "./MarketFilter";
import { filterBy, getUniqueBondTypes, getUniqueMarkets, isBondType, isOnMarkets, nominalValueLessThan, sortStrings } from "../../bonds/statistics";
import { useArrayLocalStorage, useLocalStorage } from "../../common/UseStorage";
import { BondReport } from "../../sdk/GetBonds";

const DEFAULT_MARKETS = ['GPW RR', 'GPW ASO'];

type BondsFilterParams = {
  allBondReports: BondReport[];
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

export default function BondsFilter({ allBondReports, setFilteredBondReports }: BondsFilterParams): JSX.Element {
  const [bondTypeFilterString, setBondTypeFilterString] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');
  const [maxNominalValueFilterNumber, setMaxNominalValueFilterNumber] = useLocalStorage<number>('filter.maxNominalValue', 10000);
  const [marketsFilterStrings, addMarketFilter, removeMarketFilter] = useArrayLocalStorage<string>('filter.market', DEFAULT_MARKETS);

  // Populate filtering options
  const availableBondTypes = useMemo(() => getUniqueBondTypes(allBondReports), [allBondReports]);
  const allMarkets = useMemo(() => sortStrings(getUniqueMarkets(allBondReports)), [allBondReports]);

  // Perform actual bonds filtering
  useEffect(() => {
    const filterBondReports = filterBy([isBondType(bondTypeFilterString), nominalValueLessThan(maxNominalValueFilterNumber), isOnMarkets(marketsFilterStrings)]);

    const filteredBondReports = filterBondReports(allBondReports);
    console.log(`Filtering bonds: ${filteredBondReports.length}, bond type: ${bondTypeFilterString}, max nominal value: ${maxNominalValueFilterNumber}, markets: ${marketsFilterStrings}`);
    setFilteredBondReports(filteredBondReports);
  }, [allBondReports, bondTypeFilterString, maxNominalValueFilterNumber, marketsFilterStrings]);

  return (
    <Grid container item xs={12} sm={6} md={4}>
      <BondTypeFilter bondTypes={availableBondTypes} selectedBondType={bondTypeFilterString} setSelectedBondType={setBondTypeFilterString} />
      <Grid container spacing={1} marginTop={1}>
        <Grid item xs={12} sm={6} md={4}>
          <NominalValueFilter selectedNominalValue={maxNominalValueFilterNumber} setSelectedNominalValue={setMaxNominalValueFilterNumber} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MarketFilter allMarkets={allMarkets} selectedMarkets={marketsFilterStrings} addMarket={addMarketFilter} removeMarket={removeMarketFilter} />
        </Grid>
      </Grid>
    </Grid>
  );
}