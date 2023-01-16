import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

type MarketFilterParam = {
  allMarkets: string[];
  selectedMarkets: string[];
  addMarket: (market: string) => void;
  removeMarket: (market: string) => void;
}

export default function MarketFilter({ allMarkets, selectedMarkets, addMarket, removeMarket }: MarketFilterParam) {
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
