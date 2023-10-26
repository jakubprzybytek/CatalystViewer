import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

type StringFilterParam = {
  label: string;
  all: string[];
  selected: string;
  setSelected: (value: string) => void;
}

export function StringFilter({ label, all, selected, setSelected }: StringFilterParam) {
  return (
    <FormControl fullWidth>
      <TextField label={label} size="small" fullWidth select
        value={all.includes(selected) ? selected : ''}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSelected(event.target.value)}>
        {all.map(item => (
          <MenuItem key={item} value={item}>{item}</MenuItem>
        ))}
      </TextField>
    </FormControl>
  );
}
