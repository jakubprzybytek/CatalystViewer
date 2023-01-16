import { useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { filterByBondType, getUniqueBondTypes, getUniqueMarkets, sortStrings } from "../../bonds/statistics";
import { useArrayLocalStorage, useLocalStorage } from "../../common/UseStorage";
import { BondReport } from "../../sdk/GetBonds";
import FormLabel from "@mui/material/FormLabel";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

const DEFAULT_MARKETS = ['GPW RR', 'GPW ASO'];

type BondTypeFilterParam = {
  bondTypes: string[];
  selectedBondType: string;
  setSelectedBondType: (bondType: string) => void;
}

function BondTypeFilter({ bondTypes, selectedBondType, setSelectedBondType }: BondTypeFilterParam) {
  return (
    <FormControl fullWidth>
      <TextField label="Bond type" size="small" fullWidth select
        value={bondTypes.includes(selectedBondType) ? selectedBondType : ''}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSelectedBondType(event.target.value)}>
        {bondTypes.map(bondType => (
          <MenuItem key={bondType} value={bondType}>{bondType}</MenuItem>
        ))}
      </TextField>
    </FormControl>

  );
}

type NominalValueFilterParam = {
  selectedNominalValue: number;
  setSelectedNominalValue: (nominalValue: number) => void;
}

function NominalValueFilter({ selectedNominalValue, setSelectedNominalValue }: NominalValueFilterParam) {
  return (
    <FormControl fullWidth>
      <TextField label="Max nominal value" size="small" fullWidth select
        value={selectedNominalValue}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSelectedNominalValue(Number.parseInt(event.target.value))}>
        <MenuItem value={100}>100</MenuItem>
        <MenuItem value={1000}>1000</MenuItem>
        <MenuItem value={10000}>10 000</MenuItem>
        <MenuItem value={100000}>100 000</MenuItem>
        <MenuItem value={1000000}>1 000 000</MenuItem>
      </TextField>
    </FormControl>
  );
}

type MarketFilterParam = {
  allMarkets: string[];
  selectedMarkets: string[];
  addMarket: (market: string) => void;
  removeMarket: (market: string) => void;
}

function MarketFilter({ allMarkets, selectedMarkets, addMarket, removeMarket }: MarketFilterParam) {
  return (
    <FormControl fullWidth>
      <FormLabel component="legend">Market</FormLabel>
      <FormGroup row>
        {allMarkets.map((market) => (
          <FormControlLabel key={market} control={
            <Checkbox
              checked={selectedMarkets.includes(market)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => event.target.checked ? addMarket(market) : removeMarket(market)} />
          } label={market} />
        ))}
      </FormGroup>
    </FormControl>
  );
}

type BondsFilterParams = {
  allBondReports: BondReport[];
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

export default function BondsFilter({ allBondReports, setFilteredBondReports }: BondsFilterParams): JSX.Element {
  const [bondTypeFilterString, setBondTypeFilterString] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');
  const [maxNominalValueFilterString, setMaxNominalValueFilterString] = useLocalStorage<number>('filter.maxNominalValue', 10000);
  const [marketsFilterStrings, addMarketFilter, removeMarketFilter] = useArrayLocalStorage<string>('filter.market', DEFAULT_MARKETS);

  // Populate filtering options
  const availableBondTypes = useMemo(() => getUniqueBondTypes(allBondReports), [allBondReports]);
  const allMarkets = useMemo(() => sortStrings(getUniqueMarkets(allBondReports)), [allBondReports]);

  // Perform actual bonds filtering
  useEffect(() => {
    const filteredBondReports = filterByBondType(bondTypeFilterString)(allBondReports);
    console.log(`Filtering bonds: ${filteredBondReports.length}, bond type: ${bondTypeFilterString}`);
    setFilteredBondReports(filteredBondReports);
  }, [allBondReports, bondTypeFilterString]);

  return (
    <Grid container item xs={12} sm={6} md={4}>
      <BondTypeFilter bondTypes={availableBondTypes} selectedBondType={bondTypeFilterString} setSelectedBondType={setBondTypeFilterString} />
      <Grid container spacing={1} marginTop={1}>
        <Grid item xs={12} sm={6} md={4}>
          <NominalValueFilter selectedNominalValue={maxNominalValueFilterString} setSelectedNominalValue={setMaxNominalValueFilterString} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MarketFilter allMarkets={allMarkets} selectedMarkets={marketsFilterStrings} addMarket={addMarketFilter} removeMarket={removeMarketFilter} />
        </Grid>
      </Grid>
    </Grid>
  );
}