import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

type BondTypeFilterParam = {
  bondTypes: string[];
  selectedBondType: string;
  setSelectedBondType: (bondType: string) => void;
}

export default function BondTypeFilter({ bondTypes, selectedBondType, setSelectedBondType }: BondTypeFilterParam) {
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
