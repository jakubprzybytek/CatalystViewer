import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

type MultiStringFilterParam = {
  label: string;
  all: string[];
  selected: string[];
  add: (item: string) => void;
  remove: (item: string) => void;
}

export function MultiStringFilter({ label, all, selected, add, remove }: MultiStringFilterParam) {
  return (
    <FormControl fullWidth>
      <FormLabel component="legend">{label}</FormLabel>
      <FormGroup row>
        {all.map(item => (
          <FormControlLabel key={item} control={
            <Checkbox
              checked={selected.includes(item)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => event.target.checked ? add(item) : remove(item)} />
          } label={item} />
        ))}
      </FormGroup>
    </FormControl>
  );
}
