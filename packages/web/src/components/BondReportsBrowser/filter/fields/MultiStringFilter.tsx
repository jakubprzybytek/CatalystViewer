import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

export type Option = {
  label: string;
  value: string;
}

function isOption(item: string | Option): item is Option {
  return (item as Option).label !== undefined;
}

type OptionCheckboxParam = {
  option: Option;
  checked: boolean;
  add: (item: string) => void;
  remove: (item: string) => void;
}

function OptionCheckbox({ option, checked, add, remove }: OptionCheckboxParam) {
  return (
    <FormControlLabel control={
      <Checkbox size="small" sx={{ paddingTop: 0.5, paddingBottom: 0.5 }}
        checked={checked}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => event.target.checked ? add(option.value) : remove(option.value)} />
    } label={option.label} />
  );
}

type MultiStringFilterParam = {
  label: string;
  all: string[] | Option[];
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
          isOption(item)
            ? <OptionCheckbox key={item.value} option={item} checked={selected.includes(item.value)} add={add} remove={remove} />
            : <OptionCheckbox key={item} option={{ label: item, value: item }} checked={selected.includes(item)} add={add} remove={remove} />))}
      </FormGroup>
    </FormControl>
  );
}
