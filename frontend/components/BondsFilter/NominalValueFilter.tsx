import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

type NominalValueFilterParam = {
  selectedNominalValue: number;
  setSelectedNominalValue: (nominalValue: number) => void;
}

export default function NominalValueFilter({ selectedNominalValue, setSelectedNominalValue }: NominalValueFilterParam) {
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
