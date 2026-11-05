import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";

export type ChipOption = { name: string; count: number };

type ChipFilterParam = {
  label: string;
  all: ChipOption[];
  selected: string[];
  toggle: (name: string) => void;
}

// Options as chips with a count each; several can be chosen, none means all.
export function ChipFilter({ label, all, selected, toggle }: ChipFilterParam) {
  return (
    <FormControl fullWidth>
      <FormLabel component="legend">{label}</FormLabel>
      <Stack direction='row' sx={{ flexWrap: 'wrap', gap: 0.75, pt: 0.5 }}>
        {all.map(({ name, count }) => {
          const isSelected = selected.includes(name);
          return (
            <Chip key={name} size='small' clickable
              label={`${name} ${count}`}
              color={isSelected ? 'primary' : 'default'}
              variant={isSelected ? 'filled' : 'outlined'}
              aria-pressed={isSelected}
              onClick={() => toggle(name)} />
          );
        })}
      </Stack>
    </FormControl>
  );
}
