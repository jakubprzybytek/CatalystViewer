import { useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { filterByBondType, getUniqueBondTypes } from "../../bonds/statistics";
import { useLocalStorage } from "../../common/UseStorage";
import { BondReport } from "../../sdk/GetBonds";

type BondsFilterParams = {
  allBondReports: BondReport[];
  setFilteredBondReports: (filteredBonds: BondReport[]) => void;
};

export default function BondsFilter({ allBondReports, setFilteredBondReports }: BondsFilterParams): JSX.Element {
  const [bondTypeFilterString, setBondTypeFilterString] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');

  // Populate filtering options
  const availableBondTypes = useMemo(() => getUniqueBondTypes(allBondReports), [allBondReports]);

  // Perform actual bonds filtering
  useEffect(() => {
    const filteredBondReports = filterByBondType(bondTypeFilterString)(allBondReports);
    console.log(`Filtering bonds: ${filteredBondReports.length}, bond type: ${bondTypeFilterString}`);
    setFilteredBondReports(filteredBondReports);
  }, [allBondReports, bondTypeFilterString]);

  return (
    <Grid container item xs={12} sm={6} md={4}>
      <FormControl fullWidth>
        <TextField label="Bond type" size="small" fullWidth select
          value={availableBondTypes.includes(bondTypeFilterString) ? bondTypeFilterString : ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBondTypeFilterString(event.target.value)}>
          <MenuItem value='all' sx={{ fontStyle: 'italic' }}>All</MenuItem>
          {availableBondTypes.map((bondType) => (
            <MenuItem key={bondType} value={bondType}>{bondType}</MenuItem>
          ))}
        </TextField>
      </FormControl>
    </Grid>
  );
}